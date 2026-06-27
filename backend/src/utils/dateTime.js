const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

function getDateTimePartsInTimeZone(date = new Date(), timeZone = VIETNAM_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const mapped = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      mapped[part.type] = part.value;
    }
  });

  return {
    year: mapped.year,
    month: mapped.month,
    day: mapped.day,
    hour: mapped.hour,
    minute: mapped.minute,
    second: mapped.second,
  };
}

function getTodayDateString() {
  const parts = getDateTimePartsInTimeZone();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getCurrentYearMonth() {
  const parts = getDateTimePartsInTimeZone();
  return {
    year: Number(parts.year),
    month: Number(parts.month),
  };
}

function isValidDateString(value) {
  return typeof value === 'string' && DATE_REGEX.test(value.trim());
}

function isDateOnlyInput(value) {
  return isValidDateString(value);
}

function normalizeDateInput(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (DATE_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}[T ].+$/.test(trimmed)) {
    const datePart = trimmed.slice(0, 10);
    return DATE_REGEX.test(datePart) ? datePart : null;
  }

  return null;
}

function normalizeDateTimeInput(value, { endOfDay = false } = {}) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (DATE_REGEX.test(trimmed)) {
    return `${trimmed} ${endOfDay ? '23:59:59' : '00:00:00'}`;
  }

  const normalized = trimmed.replace('T', ' ');

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function parseDateStringToUtcDate(dateStr) {
  if (!DATE_REGEX.test(dateStr)) {
    return null;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(dateStr, days) {
  const date = parseDateStringToUtcDate(dateStr);

  if (!date) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

function getDateStringsBetween(fromDate, toDate) {
  const start = parseDateStringToUtcDate(fromDate);
  const end = parseDateStringToUtcDate(toDate);

  if (!start || !end || start > end) {
    return [];
  }

  const dates = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(formatUtcDate(cursor));
  }

  return dates;
}

function getMonthBounds(year, month) {
  const startDate = `${year}-${pad(month)}-01`;
  const nextMonthStart = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${pad(month + 1)}-01`;

  return {
    startDate,
    endDate: addDays(nextMonthStart, -1),
    nextMonthStart,
  };
}

function getDateRangeBounds(dateStr) {
  const nextDate = addDays(dateStr, 1);

  return {
    start: `${dateStr} 00:00:00`,
    endExclusive: `${nextDate} 00:00:00`,
  };
}

function getMonthDateTimeBounds(year, month) {
  const { startDate, endDate, nextMonthStart } = getMonthBounds(year, month);

  return {
    startDate,
    endDate,
    start: `${startDate} 00:00:00`,
    endExclusive: `${nextMonthStart} 00:00:00`,
  };
}

function formatDbDateTime(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 19).replace('T', ' ');
  }

  if (value instanceof Date) {
    const parts = getDateTimePartsInTimeZone(value);
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }

  return null;
}

module.exports = {
  VIETNAM_TIME_ZONE,
  addDays,
  formatDbDateTime,
  getCurrentYearMonth,
  getDateRangeBounds,
  getDateStringsBetween,
  getMonthBounds,
  getMonthDateTimeBounds,
  getTodayDateString,
  isDateOnlyInput,
  isValidDateString,
  normalizeDateInput,
  normalizeDateTimeInput,
};
