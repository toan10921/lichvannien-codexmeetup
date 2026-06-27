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

// Bảng ánh xạ dịch Can Chi từ tiếng Hán sang Hán-Việt
const CAN_MAP = {
  '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu',
  '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý'
};

const CHI_MAP = {
  '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ',
  '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi'
};

/**
 * Dịch chuỗi Can Chi sang Tiếng Việt
 */
function translateGanChi(ganChiStr) {
  if (!ganChiStr || ganChiStr.length < 2) return ganChiStr;
  const gan = CAN_MAP[ganChiStr[0]] || ganChiStr[0];
  const chi = CHI_MAP[ganChiStr[1]] || ganChiStr[1];
  return `${gan} ${chi}`;
}

/**
 * Lấy danh sách ngày lễ dương lịch và âm lịch trùng khớp với ngày cụ thể
 */
async function getHolidays(solarDay, solarMonth, lunarDay, lunarMonth) {
  const [rows] = await pool.execute(
    `SELECT name, description, is_official 
     FROM holidays 
     WHERE (calendar_type = 'solar' AND day = ? AND month = ?) 
        OR (calendar_type = 'lunar' AND day = ? AND month = ?)`,
    [solarDay, solarMonth, lunarDay, lunarMonth]
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

/**
 * Lấy chi tiết thông tin của một ngày cụ thể
 * @param {string} dateStr - Định dạng YYYY-MM-DD
 * @param {number} userId - ID người dùng để lấy sự kiện cá nhân
 */
async function getDayDetail(dateStr, userId) {
  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) {
    throw new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.');
  }

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);

  // 1. Chuyển đổi âm dương lịch và tính Can Chi
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

  // 2. Lấy danh sách ngày lễ
  const holidays = await getHolidays(day, month, lunarDay, lunarMonth);

  // 3. Lấy sự kiện cá nhân của người dùng
  let events = [];
  if (userId) {
    events = await eventService.listEventsByDate(userId, dateStr);
  }

  // 4. Lấy đánh giá ngày tốt/xấu (có sử dụng cache)
  const dayAdvice = await dayAdviceService.getOrGenerateDayAdvice(
    dateStr,
    lunarDateStr,
    canChiDay
  );

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
    day_advice: dayAdvice
  };
}

/**
 * Lấy tổng quan lịch của cả tháng (phục vụ vẽ grid lịch tháng ở frontend)
 * @param {number} year - Năm dương lịch
 * @param {number} month - Tháng dương lịch (1-12)
 * @param {number} userId - ID người dùng để đánh dấu ngày có sự kiện
 */
async function getMonthOverview(year, month, userId) {
  const { startDate, endDate } = getMonthBounds(year, month);
  const { start, endExclusive } = getMonthDateTimeBounds(year, month);
  const today = getTodayDateString();
  const lastDay = Number(endDate.slice(-2));

  // 1. Lấy danh sách ngày có sự kiện của user trong tháng
  const eventCounts = new Map();
  if (userId) {
    const events = await eventService.listEventsInRange(userId, start, endExclusive);

    events.forEach((event) => {
      const eventStartDate = event.start_at.slice(0, 10);
      const eventEndDate = (event.end_at || event.start_at).slice(0, 10);
      const clampedStart = eventStartDate < startDate ? startDate : eventStartDate;
      const clampedEnd = eventEndDate > endDate ? endDate : eventEndDate;

      getDateStringsBetween(clampedStart, clampedEnd).forEach((dateStr) => {
        eventCounts.set(dateStr, (eventCounts.get(dateStr) || 0) + 1);
      });
    });
  }

  // 2. Lấy tất cả ngày lễ dương lịch trong tháng này
  const [solarHolidays] = await pool.execute(
    'SELECT day, name FROM holidays WHERE calendar_type = "solar" AND month = ?',
    [month]
  );
  const solarHolidaysMap = {};
  solarHolidays.forEach((h) => {
    solarHolidaysMap[h.day] = h.name;
  });

  const lunarHolidaysMap = await getLunarHolidayMap();

  // 3. Tạo dữ liệu cho từng ngày trong tháng
  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const currentSolarDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const solar = Solar.fromYmd(year, month, d);
    const lunar = solar.getLunar();
    
    const lDay = lunar.getDay();
    const lMonth = lunar.getMonth();

    const holidayName = solarHolidaysMap[d] || lunarHolidaysMap[`${lDay}-${lMonth}`] || null;

    days.push({
      day: d,
      solar_date: currentSolarDateStr,
      lunar_day: lDay,
      lunar_month: lMonth,
      has_event: eventCounts.has(currentSolarDateStr),
      event_count: eventCounts.get(currentSolarDateStr) || 0,
      holiday_name: holidayName,
      is_today: today === currentSolarDateStr,
      is_weekend: solar.getWeek() === 0 || solar.getWeek() === 6,
    });
  }

  return {
    year,
    month,
    days
  };
}

module.exports = {
  getDayDetail,
  getMonthOverview,
  translateGanChi
};
