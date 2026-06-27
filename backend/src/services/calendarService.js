const { Solar } = require('lunar-javascript');
const { pool } = require('../config/db');
const dayAdviceService = require('./dayAdviceService');

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
  const canChiStr = `${canChiDay} (Tháng ${canChiMonth}, Năm ${canChiYear})`;

  // 2. Lấy danh sách ngày lễ
  const holidays = await getHolidays(day, month, lunarDay, lunarMonth);

  // 3. Lấy sự kiện cá nhân của người dùng
  let events = [];
  if (userId) {
    const [eventRows] = await pool.execute(
      'SELECT id, title, description FROM calendar_events WHERE user_id = ? AND event_date = ?',
      [userId, dateStr]
    );
    events = eventRows;
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
    can_chi_day: canChiStr,
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
  // Lấy ngày đầu tiên và cuối cùng của tháng để truy vấn sự kiện
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // 1. Lấy danh sách ngày có sự kiện của user trong tháng
  let eventDates = new Set();
  if (userId) {
    const [eventRows] = await pool.execute(
      'SELECT DISTINCT event_date FROM calendar_events WHERE user_id = ? AND event_date BETWEEN ? AND ?',
      [userId, startDateStr, endDateStr]
    );
    eventRows.forEach(row => {
      // Định dạng ngày trả về từ DB thường là đối tượng Date hoặc chuỗi YYYY-MM-DD
      const dateVal = row.event_date instanceof Date 
        ? row.event_date.toISOString().split('T')[0] 
        : row.event_date;
      eventDates.add(dateVal);
    });
  }

  // 2. Lấy tất cả ngày lễ dương lịch trong tháng này
  const [solarHolidays] = await pool.execute(
    'SELECT day, name FROM holidays WHERE calendar_type = "solar" AND month = ?',
    [month]
  );
  const solarHolidaysMap = {};
  solarHolidays.forEach(h => {
    solarHolidaysMap[h.day] = h.name;
  });

  // 3. Tạo dữ liệu cho từng ngày trong tháng
  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const currentSolarDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const solar = Solar.fromYmd(year, month, d);
    const lunar = solar.getLunar();
    
    const lDay = lunar.getDay();
    const lMonth = lunar.getMonth();

    // Check ngày lễ âm lịch
    const [lunarHolidays] = await pool.execute(
      'SELECT name FROM holidays WHERE calendar_type = "lunar" AND day = ? AND month = ? LIMIT 1',
      [lDay, lMonth]
    );

    const holidayName = solarHolidaysMap[d] || (lunarHolidays.length > 0 ? lunarHolidays[0].name : null);

    days.push({
      day: d,
      solar_date: currentSolarDateStr,
      lunar_day: lDay,
      lunar_month: lMonth,
      has_event: eventDates.has(currentSolarDateStr),
      holiday_name: holidayName,
      is_today: new Date().toISOString().split('T')[0] === currentSolarDateStr
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
