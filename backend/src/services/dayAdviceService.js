const { pool } = require('../config/db');
const aiAdvisorService = require('./aiAdvisorService');

const RULE_VERSION = 'v1';

/**
 * Lấy đánh giá ngày tốt/xấu từ cache database, hoặc sinh mới từ OpenAI nếu chưa có.
 * @param {string} solarDate - Ngày dương lịch định dạng YYYY-MM-DD
 * @param {string} lunarDate - Ngày âm lịch dạng DD/MM
 * @param {string} canChiDay - Tên Can Chi của ngày
 * @returns {Promise<Object>} Đánh giá ngày
 */
async function getOrGenerateDayAdvice(solarDate, lunarDate, canChiDay) {
  try {
    // 1. Tìm kiếm trong database cache
    const [rows] = await pool.execute(
      'SELECT day_rating, good_for, avoid_for, summary FROM day_advice_cache WHERE solar_date = ? AND rule_version = ? LIMIT 1',
      [solarDate, RULE_VERSION]
    );

    if (rows.length > 0) {
      const cached = rows[0];
      
      // Parse dữ liệu JSON
      let goodFor = [];
      let avoidFor = [];
      
      try {
        goodFor = typeof cached.good_for === 'string' ? JSON.parse(cached.good_for) : (cached.good_for || []);
        avoidFor = typeof cached.avoid_for === 'string' ? JSON.parse(cached.avoid_for) : (cached.avoid_for || []);
      } catch (parseError) {
        console.error('[DayAdviceService] Failed to parse good_for/avoid_for JSON from cache:', parseError);
      }

      return {
        day_rating: cached.day_rating,
        summary: cached.summary,
        good_for: goodFor,
        avoid_for: avoidFor
      };
    }

    // 2. Nếu chưa có cache, gọi AI để sinh mới
    const advice = await aiAdvisorService.generateDayAdvice(solarDate, lunarDate, canChiDay);

    // Chuẩn bị dữ liệu để lưu vào DB
    const goodForJson = JSON.stringify(advice.good_for || []);
    const avoidForJson = JSON.stringify(advice.avoid_for || []);

    // 3. Ghi vào database cache
    await pool.execute(
      `INSERT INTO day_advice_cache 
       (solar_date, lunar_date, can_chi_day, day_rating, good_for, avoid_for, summary, rule_version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        solarDate,
        lunarDate,
        canChiDay,
        advice.day_rating,
        goodForJson,
        avoidForJson,
        advice.summary,
        RULE_VERSION
      ]
    );

    return advice;
  } catch (error) {
    console.error('[DayAdviceService] Error in getOrGenerateDayAdvice:', error);
    // Trả về dữ liệu mặc định khi có lỗi để không làm gián đoạn API chính
    return {
      day_rating: 'neutral',
      summary: 'Thông tin đánh giá ngày chưa sẵn sàng.',
      good_for: [],
      avoid_for: []
    };
  }
}

module.exports = {
  getOrGenerateDayAdvice
};
