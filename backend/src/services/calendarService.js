const { Solar } = require('lunar-javascript');
const { pool } = require('../config/db');
const dayAdviceService = require('./dayAdviceService');
const eventService = require('./eventService');
const {
  getDateStringsBetween,
  getMonthBounds,
  getMonthDateTimeBounds,
  getTodayDateString,
} = require('../utils/dateTime');

const CAN_MAP = {
  '\u7532': 'Giáp',
  '\u4e59': 'Ất',
  '\u4e19': 'Bính',
  '\u4e01': 'Đinh',
  '\u620a': 'Mậu',
  '\u5df1': 'Kỷ',
  '\u5e9a': 'Canh',
  '\u8f9b': 'Tân',
  '\u58ec': 'Nhâm',
  '\u7678': 'Quý',
};

const CHI_MAP = {
  '\u5b50': 'Tý',
  '\u4e11': 'Sửu',
  '\u5bc5': 'Dần',
  '\u536f': 'Mão',
  '\u8fb0': 'Thìn',
  '\u5df3': 'Tỵ',
  '\u5348': 'Ngọ',
  '\u672a': 'Mùi',
  '\u7533': 'Thân',
  '\u9149': 'Dậu',
  '\u620c': 'Tuất',
  '\u4ea5': 'Hợi',
};

function translateGanChi(ganChiStr) {
  if (!ganChiStr || ganChiStr.length < 2) {
    return ganChiStr;
  }

  const gan = CAN_MAP[ganChiStr[0]] || ganChiStr[0];
  const chi = CHI_MAP[ganChiStr[1]] || ganChiStr[1];
  return `${gan} ${chi}`;
}

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
