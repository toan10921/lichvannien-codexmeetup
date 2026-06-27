const { Solar } = require('lunar-javascript');
const { pool } = require('../config/db');
const dayAdviceService = require('./dayAdviceService');
const eventService = require('./eventService');
const {
  getHourRangeByZhi,
  translateChi,
  translateDayType,
  translateGanChi,
  translateLuck,
  translateNaYin,
  translateShengXiao,
  translateTianShen,
} = require('../utils/lunarText');
const {
  getDateStringsBetween,
  getMonthBounds,
  getMonthDateTimeBounds,
  getTodayDateString,
} = require('../utils/dateTime');

const HOUR_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function assertDateOnly(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');

  if (!match) {
    throw new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.');
  }

  return { year, month, day };
}

async function getHolidays(solarDay, solarMonth, lunarDay, lunarMonth) {
  const [rows] = await pool.execute(
    `SELECT name, description, is_official
       FROM holidays
      WHERE (calendar_type = 'solar' AND day = ? AND month = ?)
         OR (calendar_type = 'lunar' AND day = ? AND month = ?)`,
    [solarDay, solarMonth, lunarDay, lunarMonth],
  );

  return rows;
}

async function getLunarHolidayMap() {
  const [rows] = await pool.execute(
    `SELECT day, month, name
       FROM holidays
      WHERE calendar_type = 'lunar'`,
  );

  return rows.reduce((accumulator, row) => {
    accumulator[`${row.day}-${row.month}`] = row.name;
    return accumulator;
  }, {});
}

function buildDayQuality(lunar) {
  const type = translateDayType(lunar.getDayTianShenType());
  return {
    key: lunar.getDayTianShenType() === '黄道' ? 'hoang-dao' : 'hac-dao',
    label: type === 'Hoàng đạo' ? 'Ngày hoàng đạo' : 'Ngày hắc đạo',
    type,
    tian_shen: translateTianShen(lunar.getDayTianShen()),
    luck: translateLuck(lunar.getDayTianShenLuck()),
  };
}

function buildConflictAge(lunar) {
  const rawDesc = lunar.getChongDesc() || '';
  const match = /\(([^)]+)\)(.+)/.exec(rawDesc);
  const canChi = match ? translateGanChi(match[1]) : '';
  const zodiac = translateShengXiao(match ? match[2] : lunar.getChongShengXiao());
  const branch = translateChi(lunar.getChong());

  return {
    branch,
    zodiac,
    can_chi: canChi || null,
    label: canChi
      ? `${canChi}${zodiac ? ` (${zodiac})` : ''}`
      : branch
        ? `${branch}${zodiac ? ` (${zodiac})` : ''}`
        : zodiac,
  };
}

function buildDayElement(lunar) {
  const raw = lunar.getDayNaYin();
  return {
    raw,
    label: translateNaYin(raw),
  };
}

function buildGoodHours(lunar) {
  const seen = new Set();

  return lunar.getTimes()
    .filter((time) => time.getTianShenType() === '黄道' || time.getTianShenLuck() === '吉')
    .filter((time) => {
      const zhi = time.getZhi();
      if (seen.has(zhi)) {
        return false;
      }
      seen.add(zhi);
      return true;
    })
    .sort((left, right) => HOUR_ORDER.indexOf(left.getZhi()) - HOUR_ORDER.indexOf(right.getZhi()))
    .map((time) => {
      const zhi = time.getZhi();
      const label = translateChi(zhi);
      const timeRange = getHourRangeByZhi(zhi);

      return {
        key: zhi,
        label,
        time_range: timeRange,
        display_text: `${label} (${timeRange})`,
        tian_shen: translateTianShen(time.getTianShen()),
        luck: translateLuck(time.getTianShenLuck()),
      };
    });
}

async function getDayDetail(dateStr, userId) {
  const { year, month, day } = assertDateOnly(dateStr);
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();

  const weekdayMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const weekday = weekdayMap[solar.getWeek()];
  const lunarDay = lunar.getDay();
  const lunarMonth = lunar.getMonth();
  const lunarYear = lunar.getYear();
  const lunarDateStr = `${lunarDay}/${lunarMonth} âm lịch`;
  const canChiDay = translateGanChi(lunar.getDayInGanZhi());
  const canChiMonth = translateGanChi(lunar.getMonthInGanZhi());
  const canChiYear = translateGanChi(lunar.getYearInGanZhi());
  const dayQuality = buildDayQuality(lunar);
  const dayElement = buildDayElement(lunar);
  const conflictAge = buildConflictAge(lunar);
  const goodHours = buildGoodHours(lunar);

  const [holidays, events, dayAdvice] = await Promise.all([
    getHolidays(day, month, lunarDay, lunarMonth),
    userId ? eventService.listEventsByDate(userId, dateStr) : Promise.resolve([]),
    dayAdviceService.getOrGenerateDayAdvice(dateStr, lunarDateStr, canChiDay),
  ]);

  return {
    solar_date: dateStr,
    weekday,
    lunar_date: lunarDateStr,
    solar: {
      year,
      month,
      day,
    },
    lunar: {
      year: lunarYear,
      month: lunarMonth,
      day: lunarDay,
    },
    can_chi_day: canChiDay,
    can_chi_month: canChiMonth,
    can_chi_year: canChiYear,
    day_quality: dayQuality,
    day_element: dayElement,
    conflict_age: conflictAge,
    good_hours: goodHours,
    holidays,
    events,
    day_advice: dayAdvice,
  };
}

async function getMonthOverview(year, month, userId) {
  const { startDate, endDate } = getMonthBounds(year, month);
  const { start, endExclusive } = getMonthDateTimeBounds(year, month);
  const today = getTodayDateString();
  const lastDay = Number(endDate.slice(-2));
  const eventCounts = new Map();

  if (userId) {
    const events = await eventService.listEventsInRange(userId, start, endExclusive);

    events.forEach((event) => {
      const eventStartDate = event.start_at.slice(0, 10);
      const eventEndDate = (event.end_at || event.start_at).slice(0, 10);
      const activeDates = getDateStringsBetween(
        eventStartDate < startDate ? startDate : eventStartDate,
        eventEndDate > endDate ? endDate : eventEndDate,
      );

      activeDates.forEach((date) => {
        eventCounts.set(date, (eventCounts.get(date) || 0) + 1);
      });
    });
  }

  const [solarHolidays] = await pool.execute(
    'SELECT day, name FROM holidays WHERE calendar_type = "solar" AND month = ?',
    [month],
  );
  const solarHolidaysMap = {};
  solarHolidays.forEach((holiday) => {
    solarHolidaysMap[holiday.day] = holiday.name;
  });

  const lunarHolidaysMap = await getLunarHolidayMap();
  const days = [];

  for (let d = 1; d <= lastDay; d += 1) {
    const currentSolarDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const currentSolar = Solar.fromYmd(year, month, d);
    const currentLunar = currentSolar.getLunar();
    const lunarDay = currentLunar.getDay();
    const lunarMonth = currentLunar.getMonth();
    const holidayName = solarHolidaysMap[d] || lunarHolidaysMap[`${lunarDay}-${lunarMonth}`] || null;

    days.push({
      day: d,
      solar_date: currentSolarDateStr,
      lunar_day: lunarDay,
      lunar_month: lunarMonth,
      has_event: eventCounts.has(currentSolarDateStr),
      event_count: eventCounts.get(currentSolarDateStr) || 0,
      holiday_name: holidayName,
      is_today: today === currentSolarDateStr,
      is_weekend: currentSolar.getWeek() === 0 || currentSolar.getWeek() === 6,
    });
  }

  return {
    year,
    month,
    days,
  };
}

module.exports = {
  getDayDetail,
  getMonthOverview,
  translateGanChi,
};
