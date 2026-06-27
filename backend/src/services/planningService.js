const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const eventService = require('./eventService');
const calendarService = require('./calendarService');
const {
  addDays,
  getDateStringsBetween,
  getTodayDateString,
  normalizeDateInput,
  normalizeDateTimeInput,
} = require('../utils/dateTime');

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_TIME_OF_DAY = new Set(['any', 'morning', 'afternoon', 'evening']);
const DAYTIME_WINDOWS = {
  morning: [6, 11],
  afternoon: [12, 17],
  evening: [18, 21],
};
const DEFAULT_TIME_BY_PERIOD = {
  any: ['09:00', '14:00', '19:00'],
  morning: ['09:00'],
  afternoon: ['14:00'],
  evening: ['19:00'],
};

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

function parsePositiveInt(value, fieldName, { min = 1, max = 100000 } = {}) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(`${fieldName} must be an integer between ${min} and ${max}`, 422);
  }

  return parsed;
}

function formatSuggestions(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatPlanningItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    duration_minutes: Number(row.duration_minutes),
    earliest_date: row.earliest_date,
    latest_date: row.latest_date,
    preferred_time_of_day: row.preferred_time_of_day,
    avoid_weekends: Boolean(row.avoid_weekends),
    prefer_good_day: Boolean(row.prefer_good_day),
    is_all_day: Boolean(row.is_all_day),
    status: row.status,
    last_suggestions: formatSuggestions(row.last_suggestions),
    selected_start_at: row.selected_start_at,
    selected_end_at: row.selected_end_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildPlanningPayload(payload, fallback = {}) {
  const title = normalizeText(hasOwn(payload, 'title') ? payload.title : fallback.title, 'title', {
    required: true,
    maxLength: 150,
  });
  const description = normalizeText(
    hasOwn(payload, 'description') ? payload.description : fallback.description,
    'description',
  );
  const category = normalizeText(
    hasOwn(payload, 'category') ? payload.category : fallback.category,
    'category',
    { maxLength: 80 },
  );
  const priority = hasOwn(payload, 'priority') ? payload.priority : fallback.priority || 'medium';
  if (!VALID_PRIORITIES.has(priority)) {
    throw new AppError('priority must be low, medium or high', 422);
  }

  const preferredTimeOfDay = hasOwn(payload, 'preferred_time_of_day')
    ? payload.preferred_time_of_day
    : fallback.preferred_time_of_day || 'any';
  if (!VALID_TIME_OF_DAY.has(preferredTimeOfDay)) {
    throw new AppError('preferred_time_of_day must be any, morning, afternoon or evening', 422);
  }

  const durationMinutes = hasOwn(payload, 'duration_minutes')
    ? parsePositiveInt(payload.duration_minutes, 'duration_minutes', { min: 30, max: 720 })
    : Number(fallback.duration_minutes || 60);

  const earliestDate = normalizeDateInput(
    hasOwn(payload, 'earliest_date') ? payload.earliest_date : fallback.earliest_date,
  );
  const latestDate = normalizeDateInput(
    hasOwn(payload, 'latest_date') ? payload.latest_date : fallback.latest_date,
  );

  if (!earliestDate || !latestDate) {
    throw new AppError('earliest_date and latest_date must use YYYY-MM-DD', 422);
  }

  if (earliestDate > latestDate) {
    throw new AppError('latest_date must be greater than or equal to earliest_date', 422);
  }

  const rangeDays = getDateStringsBetween(earliestDate, latestDate).length;
  if (rangeDays > 45) {
    throw new AppError('Khoảng ngày đề xuất tối đa là 45 ngày.', 422);
  }

  const avoidWeekends = hasOwn(payload, 'avoid_weekends')
    ? parseBoolean(payload.avoid_weekends)
    : Boolean(fallback.avoid_weekends);
  const preferGoodDay = hasOwn(payload, 'prefer_good_day')
    ? parseBoolean(payload.prefer_good_day)
    : fallback.prefer_good_day === undefined
      ? true
      : Boolean(fallback.prefer_good_day);
  const isAllDay = hasOwn(payload, 'is_all_day')
    ? parseBoolean(payload.is_all_day)
    : Boolean(fallback.is_all_day);

  return {
    title,
    description,
    category,
    priority,
    duration_minutes: durationMinutes,
    earliest_date: earliestDate,
    latest_date: latestDate,
    preferred_time_of_day: preferredTimeOfDay,
    avoid_weekends: avoidWeekends,
    prefer_good_day: preferGoodDay,
    is_all_day: isAllDay,
  };
}

function timeMatchesPreference(hour, preferredTimeOfDay) {
  if (preferredTimeOfDay === 'any') {
    return hour >= 6 && hour <= 21;
  }

  const window = DAYTIME_WINDOWS[preferredTimeOfDay];
  return hour >= window[0] && hour <= window[1];
}

function extractStartHour(timeRange) {
  const match = /^(\d{1,2})h/.exec(timeRange || '');
  return match ? Number(match[1]) : null;
}

function addMinutesToDateTime(dateTimeValue, minutes) {
  const normalized = dateTimeValue.replace(' ', 'T');
  const date = new Date(`${normalized}Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
}

function sameDate(dateTimeValue, dateStr) {
  return dateTimeValue && dateTimeValue.slice(0, 10) === dateStr;
}

function hasConflict(events, startAt, endAt) {
  return events.some((event) => {
    const eventStart = event.start_at;
    const eventEnd = event.end_at || event.start_at;
    return startAt < eventEnd && endAt > eventStart;
  });
}

function buildCandidateSlots(item, detail) {
  const date = detail.solar_date;

  if (item.is_all_day) {
    return [{
      start_at: `${date} 00:00:00`,
      end_at: `${date} 23:59:59`,
      is_all_day: true,
      from_good_hour: false,
      display_label: `Cả ngày ${detail.weekday.toLowerCase()}`,
    }];
  }

  const goodHourCandidates = (detail.good_hours || [])
    .map((hour) => {
      const startHour = extractStartHour(hour.time_range);
      if (startHour === null || startHour < 6 || startHour > 21) {
        return null;
      }

      if (!timeMatchesPreference(startHour, item.preferred_time_of_day)) {
        return null;
      }

      return {
        time: `${String(startHour).padStart(2, '0')}:00`,
        from_good_hour: true,
        display_label: hour.display_text,
      };
    })
    .filter(Boolean);

  const fallbackCandidates = DEFAULT_TIME_BY_PERIOD[item.preferred_time_of_day]
    .map((time) => ({
      time,
      from_good_hour: false,
      display_label: `${time} (${detail.weekday.toLowerCase()})`,
    }));

  const candidates = [...goodHourCandidates, ...fallbackCandidates];
  const seen = new Set();

  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.time)) {
        return false;
      }
      seen.add(candidate.time);
      return true;
    })
    .map((candidate) => {
      const startAt = `${date} ${candidate.time}:00`;
      const endAt = addMinutesToDateTime(startAt, item.duration_minutes);
      if (!sameDate(endAt, date)) {
        return null;
      }

      return {
        start_at: startAt,
        end_at: endAt,
        is_all_day: false,
        from_good_hour: candidate.from_good_hour,
        display_label: candidate.display_label,
      };
    })
    .filter(Boolean);
}

function scoreSuggestion(item, detail, candidate, sameDayEvents) {
  let score = 0;
  const rating = detail.day_advice?.day_rating || 'neutral';

  if (rating === 'favorable') {
    score += 4;
  } else if (rating === 'neutral') {
    score += 1;
  } else {
    score -= 2;
  }

  if (detail.day_quality?.key === 'hoang-dao') {
    score += 2;
  } else {
    score -= 1;
  }

  if (item.prefer_good_day) {
    if (rating === 'favorable') {
      score += 3;
    } else if (rating === 'caution') {
      score -= 3;
    }
  }

  if (candidate.from_good_hour) {
    score += 2;
  }

  score -= Math.min(sameDayEvents.length, 3);

  if (item.priority === 'high' && rating === 'favorable') {
    score += 1;
  }

  return score;
}

function buildSuggestionReason(detail, candidate, sameDayEvents) {
  const fragments = [];

  if (detail.day_quality?.label) {
    fragments.push(detail.day_quality.label.toLowerCase());
  }

  if (candidate.from_good_hour) {
    fragments.push(`khớp giờ cát ${candidate.display_label}`);
  }

  if (sameDayEvents.length === 0) {
    fragments.push('không bị chồng lịch trong ngày');
  } else {
    fragments.push(`có ${sameDayEvents.length} sự kiện khác trong ngày nên cần sắp xếp kỹ`);
  }

  if (detail.day_advice?.summary) {
    fragments.push(detail.day_advice.summary);
  }

  return fragments.join('. ');
}

async function findPlanningItemById(userId, planningItemId) {
  const [rows] = await pool.execute(
    `SELECT id, title, description, category, priority, duration_minutes,
            DATE_FORMAT(earliest_date, '%Y-%m-%d') AS earliest_date,
            DATE_FORMAT(latest_date, '%Y-%m-%d') AS latest_date,
            preferred_time_of_day, avoid_weekends, prefer_good_day, is_all_day, status,
            last_suggestions,
            DATE_FORMAT(selected_start_at, '%Y-%m-%d %H:%i:%s') AS selected_start_at,
            DATE_FORMAT(selected_end_at, '%Y-%m-%d %H:%i:%s') AS selected_end_at,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM planning_items
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
    [planningItemId, userId],
  );

  return rows.length > 0 ? formatPlanningItem(rows[0]) : null;
}

async function listPlanningItems(userId) {
  const [rows] = await pool.execute(
    `SELECT id, title, description, category, priority, duration_minutes,
            DATE_FORMAT(earliest_date, '%Y-%m-%d') AS earliest_date,
            DATE_FORMAT(latest_date, '%Y-%m-%d') AS latest_date,
            preferred_time_of_day, avoid_weekends, prefer_good_day, is_all_day, status,
            last_suggestions,
            DATE_FORMAT(selected_start_at, '%Y-%m-%d %H:%i:%s') AS selected_start_at,
            DATE_FORMAT(selected_end_at, '%Y-%m-%d %H:%i:%s') AS selected_end_at,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
       FROM planning_items
      WHERE user_id = ?
        AND status <> 'cancelled'
      ORDER BY status = 'suggested' DESC, earliest_date ASC, id DESC`,
    [userId],
  );

  return rows.map(formatPlanningItem);
}

async function createPlanningItem(userId, payload) {
  const normalized = buildPlanningPayload(payload);
  const [result] = await pool.execute(
    `INSERT INTO planning_items
      (user_id, title, description, category, priority, duration_minutes,
       earliest_date, latest_date, preferred_time_of_day, avoid_weekends,
       prefer_good_day, is_all_day)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      normalized.title,
      normalized.description,
      normalized.category,
      normalized.priority,
      normalized.duration_minutes,
      normalized.earliest_date,
      normalized.latest_date,
      normalized.preferred_time_of_day,
      normalized.avoid_weekends,
      normalized.prefer_good_day,
      normalized.is_all_day,
    ],
  );

  return findPlanningItemById(userId, result.insertId);
}

async function deletePlanningItem(userId, planningItemId) {
  const existing = await findPlanningItemById(userId, planningItemId);
  if (!existing) {
    throw new AppError('Planning item not found', 404);
  }

  await pool.execute(
    'UPDATE planning_items SET status = "cancelled" WHERE id = ? AND user_id = ?',
    [planningItemId, userId],
  );
}

async function generateSuggestions(userId, planningItemId) {
  const item = await findPlanningItemById(userId, planningItemId);
  if (!item) {
    throw new AppError('Planning item not found', 404);
  }

  const dates = getDateStringsBetween(item.earliest_date, item.latest_date);
  const rangeStart = `${item.earliest_date} 00:00:00`;
  const rangeEndExclusive = `${addDays(item.latest_date, 1)} 00:00:00`;
  const allEvents = await eventService.listEventsInRange(userId, rangeStart, rangeEndExclusive);
  const suggestions = [];

  for (const date of dates) {
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (item.avoid_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    const detail = await calendarService.getDayDetail(date, userId);
    const sameDayEvents = allEvents.filter((event) => {
      const eventStartDate = event.start_at.slice(0, 10);
      const eventEndDate = (event.end_at || event.start_at).slice(0, 10);
      return eventStartDate <= date && eventEndDate >= date;
    });

    const candidates = buildCandidateSlots(item, detail);
    candidates.forEach((candidate) => {
      if (hasConflict(allEvents, candidate.start_at, candidate.end_at || candidate.start_at)) {
        return;
      }

      const score = scoreSuggestion(item, detail, candidate, sameDayEvents);
      suggestions.push({
        date,
        start_at: candidate.start_at,
        end_at: candidate.end_at,
        is_all_day: candidate.is_all_day,
        display_label: candidate.display_label,
        score,
        day_rating: detail.day_advice?.day_rating || 'neutral',
        day_quality_label: detail.day_quality?.label || '',
        reason: buildSuggestionReason(detail, candidate, sameDayEvents),
      });
    });
  }

  const topSuggestions = suggestions
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.start_at.localeCompare(right.start_at);
    })
    .slice(0, 5)
    .map((suggestion, index) => ({
      ...suggestion,
      rank: index + 1,
    }));

  await pool.execute(
    `UPDATE planning_items
        SET status = ?,
            last_suggestions = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
    [topSuggestions.length > 0 ? 'suggested' : 'draft', JSON.stringify(topSuggestions), planningItemId, userId],
  );

  return {
    item: await findPlanningItemById(userId, planningItemId),
    suggestions: topSuggestions,
  };
}

async function confirmSuggestion(userId, planningItemId, payload) {
  const item = await findPlanningItemById(userId, planningItemId);
  if (!item) {
    throw new AppError('Planning item not found', 404);
  }

  const startAt = normalizeDateTimeInput(payload.start_at, { endOfDay: false });
  if (!startAt) {
    throw new AppError('start_at must be a valid date/datetime', 422);
  }

  const isAllDay = payload.is_all_day === undefined
    ? Boolean(item.is_all_day)
    : parseBoolean(payload.is_all_day);
  const endAt = payload.end_at
    ? normalizeDateTimeInput(payload.end_at, {
      endOfDay: isAllDay && Boolean(normalizeDateInput(payload.end_at)),
    })
    : item.is_all_day
      ? normalizeDateTimeInput(startAt.slice(0, 10), { endOfDay: true })
      : addMinutesToDateTime(startAt, item.duration_minutes);

  const event = await eventService.createEvent(userId, {
    title: item.title,
    description: item.description,
    start_at: startAt,
    end_at: endAt,
    is_all_day: isAllDay,
  });

  await pool.execute(
    `UPDATE planning_items
        SET status = 'scheduled',
            selected_start_at = ?,
            selected_end_at = ?,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
    [event.start_at, event.end_at, planningItemId, userId],
  );

  return {
    item: await findPlanningItemById(userId, planningItemId),
    event,
  };
}

async function listPlanningTimeline(userId, { fromDate = getTodayDateString(), limit = 20 } = {}) {
  const planningItems = await listPlanningItems(userId);
  const fixedEvents = await eventService.listUpcomingEvents(userId, { fromDate, limit });

  const flexibleItems = planningItems
    .filter((item) => item.status !== 'scheduled')
    .map((item) => ({
      id: item.id,
      kind: 'flexible',
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status,
      sort_at: `${item.earliest_date} 00:00:00`,
      earliest_date: item.earliest_date,
      latest_date: item.latest_date,
      duration_minutes: item.duration_minutes,
      preferred_time_of_day: item.preferred_time_of_day,
      avoid_weekends: item.avoid_weekends,
      prefer_good_day: item.prefer_good_day,
      is_all_day: item.is_all_day,
      suggestions: item.last_suggestions || [],
    }));

  const scheduledItems = fixedEvents.map((event) => ({
    id: event.id,
    kind: 'fixed',
    title: event.title,
    description: event.description,
    status: 'scheduled',
    sort_at: event.start_at,
    start_at: event.start_at,
    end_at: event.end_at,
    is_all_day: event.is_all_day,
  }));

  return [...scheduledItems, ...flexibleItems]
    .sort((left, right) => left.sort_at.localeCompare(right.sort_at))
    .slice(0, limit);
}

module.exports = {
  confirmSuggestion,
  createPlanningItem,
  deletePlanningItem,
  generateSuggestions,
  listPlanningTimeline,
};
