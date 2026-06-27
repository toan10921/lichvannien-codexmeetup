const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const {
  getCurrentYearMonth,
  getDateRangeBounds,
  getMonthDateTimeBounds,
  isDateOnlyInput,
  normalizeDateTimeInput,
} = require('../utils/dateTime');

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return Boolean(value);
}

function normalizeText(value, fieldName, { required = false, maxLength = null } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new AppError(`${fieldName} is required`, 422);
    }

    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} must be a string`, 422);
  }

  const trimmed = value.trim();

  if (required && !trimmed) {
    throw new AppError(`${fieldName} is required`, 422);
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new AppError(`${fieldName} must be at most ${maxLength} characters`, 422);
  }

  return trimmed || null;
}

function buildEventPayload(payload, fallback = {}) {
  const rawStartAt = hasOwn(payload, 'start_at') ? payload.start_at : fallback.start_at;
  const rawEndAt = hasOwn(payload, 'end_at') ? payload.end_at : fallback.end_at;
  const rawIsAllDay = hasOwn(payload, 'is_all_day') ? payload.is_all_day : fallback.is_all_day;

  const title = normalizeText(hasOwn(payload, 'title') ? payload.title : fallback.title, 'title', {
    required: true,
    maxLength: 150,
  });
  const description = normalizeText(
    hasOwn(payload, 'description') ? payload.description : fallback.description,
    'description',
  );

  const isAllDay = rawIsAllDay === undefined
    ? isDateOnlyInput(rawStartAt)
    : parseBoolean(rawIsAllDay);

  const startAt = normalizeDateTimeInput(rawStartAt, {
    endOfDay: false,
  });

  if (!startAt) {
    throw new AppError('start_at must be a valid date/datetime', 422);
  }

  let endAt = null;
  if (rawEndAt !== undefined && rawEndAt !== null && rawEndAt !== '') {
    endAt = normalizeDateTimeInput(rawEndAt, {
      endOfDay: isAllDay && isDateOnlyInput(rawEndAt),
    });

    if (!endAt) {
      throw new AppError('end_at must be a valid date/datetime', 422);
    }
  } else if (isAllDay) {
    endAt = normalizeDateTimeInput(startAt.slice(0, 10), { endOfDay: true });
  }

  if (endAt && endAt < startAt) {
    throw new AppError('end_at must be greater than or equal to start_at', 422);
  }

  return {
    title,
    description,
    start_at: startAt,
    end_at: endAt,
    is_all_day: isAllDay,
  };
}

function formatEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    start_at: row.start_at,
    end_at: row.end_at,
    is_all_day: Boolean(row.is_all_day),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findEventById(userId, eventId) {
  const [rows] = await pool.execute(
    `SELECT id, title, description,
            DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at,
            DATE_FORMAT(end_at, '%Y-%m-%d %H:%i:%s') AS end_at,
            is_all_day,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM calendar_events
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
    [eventId, userId],
  );

  return rows.length > 0 ? formatEvent(rows[0]) : null;
}

async function listEventsInRange(userId, rangeStart, rangeEndExclusive) {
  const [rows] = await pool.execute(
    `SELECT id, title, description,
            DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at,
            DATE_FORMAT(end_at, '%Y-%m-%d %H:%i:%s') AS end_at,
            is_all_day,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM calendar_events
      WHERE user_id = ?
        AND start_at < ?
        AND COALESCE(end_at, start_at) >= ?
      ORDER BY start_at ASC, id ASC`,
    [userId, rangeEndExclusive, rangeStart],
  );

  return rows.map(formatEvent);
}

async function listEventsByMonth(userId, monthValue) {
  const current = getCurrentYearMonth();
  const normalizedMonth = monthValue || `${current.year}-${String(current.month).padStart(2, '0')}`;

  const match = /^(\d{4})-(\d{2})$/.exec(normalizedMonth);
  if (!match) {
    throw new AppError('month must have format YYYY-MM', 422);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw new AppError('month must be between 01 and 12', 422);
  }

  const range = getMonthDateTimeBounds(year, month);
  const events = await listEventsInRange(userId, range.start, range.endExclusive);

  return {
    month: normalizedMonth,
    events,
  };
}

async function listEventsByDate(userId, dateStr) {
  const range = getDateRangeBounds(dateStr);
  return listEventsInRange(userId, range.start, range.endExclusive);
}

async function createEvent(userId, payload) {
  const normalized = buildEventPayload(payload);

  const [result] = await pool.execute(
    `INSERT INTO calendar_events (user_id, title, description, start_at, end_at, is_all_day)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      normalized.title,
      normalized.description,
      normalized.start_at,
      normalized.end_at,
      normalized.is_all_day,
    ],
  );

  return findEventById(userId, result.insertId);
}

async function updateEvent(userId, eventId, payload) {
  const existing = await findEventById(userId, eventId);

  if (!existing) {
    throw new AppError('Event not found', 404);
  }

  const normalized = buildEventPayload(payload, existing);

  await pool.execute(
    `UPDATE calendar_events
        SET title = ?,
            description = ?,
            start_at = ?,
            end_at = ?,
            is_all_day = ?
      WHERE id = ? AND user_id = ?`,
    [
      normalized.title,
      normalized.description,
      normalized.start_at,
      normalized.end_at,
      normalized.is_all_day,
      eventId,
      userId,
    ],
  );

  return findEventById(userId, eventId);
}

async function deleteEvent(userId, eventId) {
  const existing = await findEventById(userId, eventId);

  if (!existing) {
    throw new AppError('Event not found', 404);
  }

  await pool.execute(
    'DELETE FROM calendar_events WHERE id = ? AND user_id = ?',
    [eventId, userId],
  );
}

module.exports = {
  createEvent,
  deleteEvent,
  listEventsByDate,
  listEventsByMonth,
  listEventsInRange,
  updateEvent,
};
