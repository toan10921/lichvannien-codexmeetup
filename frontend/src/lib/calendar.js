const WEEKDAYS = [
  'Thứ hai',
  'Thứ ba',
  'Thứ tư',
  'Thứ năm',
  'Thứ sáu',
  'Thứ bảy',
  'Chủ nhật',
];

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function pad(value) {
  return String(value).padStart(2, '0');
}

export function getTodayInVietnam() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const mapped = {};

  parts.forEach((part) => {
    if (part.type !== 'literal') {
      mapped[part.type] = part.value;
    }
  });

  return `${mapped.year}-${mapped.month}-${mapped.day}`;
}

export function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

export function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export function shiftMonth(monthKey, offset) {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(year, month - 1 + offset, 1);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function clampDateToMonth(dateStr, monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  const day = Number(dateStr.slice(8, 10));
  const maxDay = new Date(year, month, 0).getDate();

  return `${year}-${pad(month)}-${pad(Math.min(day, maxDay))}`;
}

export function addDaysToDate(dateStr, offset) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function buildCalendarGrid(days, year, month) {
  const firstDate = new Date(year, month - 1, 1);
  const firstWeekdayIndex = (firstDate.getDay() + 6) % 7;
  const cells = Array.from({ length: firstWeekdayIndex }, () => null);

  days.forEach((day) => {
    cells.push(day);
  });

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function getMonthHeading(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1]} - ${year}`;
}

export function formatMonthYear(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return `Tháng ${pad(month)} năm ${year}`;
}

export function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${pad(day)}/${pad(month)}/${year}`;
}

export function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const normalized = value.replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatTimeRange(startAt, endAt, isAllDay) {
  if (isAllDay) {
    const startDate = startAt?.slice(0, 10);
    const endDate = endAt?.slice(0, 10);

    if (startDate && endDate && startDate !== endDate) {
      return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
    }

    return 'Cả ngày';
  }

  const start = formatDateTime(startAt);
  const end = endAt ? formatDateTime(endAt) : '';

  return end ? `${start} → ${end}` : start;
}

export function toDateInputValue(dateTimeValue) {
  return dateTimeValue ? dateTimeValue.slice(0, 10) : '';
}

export function toDateTimeInputValue(dateTimeValue) {
  return dateTimeValue ? dateTimeValue.replace(' ', 'T').slice(0, 16) : '';
}

export function toApiDateTimeValue(formValue, isAllDay) {
  if (!formValue) {
    return null;
  }

  if (isAllDay) {
    return formValue;
  }

  return formValue.replace('T', ' ');
}

export function getWeekdays() {
  return WEEKDAYS;
}

export function getMonthOptions() {
  return MONTH_NAMES.map((label, index) => ({
    value: index + 1,
    label,
  }));
}

export function getYearOptions(centerYear) {
  return Array.from({ length: 11 }, (_, index) => centerYear - 5 + index);
}
