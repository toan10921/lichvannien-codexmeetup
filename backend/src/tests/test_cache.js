/**
 * Test script kiểm tra cơ chế ghi và đọc cache DB cho đánh giá ngày tốt/xấu
 */
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'lunar_user';
process.env.DB_PASSWORD = 'lunar_password';
process.env.DB_NAME = 'lunar_calendar_mvp';
process.env.JWT_SECRET = 'dev-secret-change-in-production';

const dayAdviceService = require('../services/dayAdviceService');
const { pool } = require('../config/db');

async function run() {
  console.log('=== [Kịch bản 2] Bắt đầu kiểm tra Cơ chế Cache DB ===');
  
  // Dùng một ngày ngẫu nhiên để tránh đụng độ cache cũ
  const testDate = '2026-08-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  console.log(`Kiểm thử với ngày ngẫu nhiên: ${testDate}`);

  // 1. Xóa cache cũ của ngày này nếu có
  await pool.execute('DELETE FROM day_advice_cache WHERE solar_date = ?', [testDate]);
  console.log(`Đã làm sạch cache cũ cho ngày ${testDate}`);

  // Lần gọi 1: Chưa có cache (sẽ gọi AI hoặc lấy fallback nếu sai key)
  console.log('\n--- Lần gọi thứ nhất (Chưa có cache) ---');
  const start1 = Date.now();
  const advice1 = await dayAdviceService.getOrGenerateDayAdvice(testDate, '15/6 âm lịch', 'Giáp Tý');
  const duration1 = Date.now() - start1;
  
  console.log(`Thời gian xử lý Lần 1: ${duration1}ms`);
  console.log('Kết quả Lần 1:', JSON.stringify(advice1));

  // Lần gọi 2: Đã có cache (chắc chắn phải lấy từ DB)
  console.log('\n--- Lần gọi thứ hai (Đã có cache) ---');
  const start2 = Date.now();
  const advice2 = await dayAdviceService.getOrGenerateDayAdvice(testDate, '15/6 âm lịch', 'Giáp Tý');
  const duration2 = Date.now() - start2;
  
  console.log(`Thời gian xử lý Lần 2: ${duration2}ms`);
  console.log('Kết quả Lần 2:', JSON.stringify(advice2));

  // Kiểm tra tính hợp lệ
  const isCachedInDB = duration2 < 100; // Tốc độ đọc DB cục bộ thông thường < 100ms
  
  // Kiểm tra bản ghi trong DB thực tế
  const [rows] = await pool.execute('SELECT id, day_rating FROM day_advice_cache WHERE solar_date = ?', [testDate]);
  const existsInDB = rows.length > 0;

  if (isCachedInDB && existsInDB) {
    console.log('\n[PASS] Cơ chế cache hoạt động HOÀN HẢO!');
    console.log(`  - Lần 1 (Gọi AI/Fallback): ${duration1}ms`);
    console.log(`  - Lần 2 (Đọc cache DB): ${duration2}ms (Giảm ${((duration1 - duration2)/duration1 * 100).toFixed(1)}% thời gian)`);
    console.log(`  - Đã tìm thấy bản ghi cache trong DB (ID: ${rows[0].id}, Đánh giá: ${rows[0].day_rating})`);
  } else {
    console.log('\n[FAIL] Lỗi cơ chế cache!');
    console.log(`  - Lần 2 tốn: ${duration2}ms`);
    console.log(`  - Bản ghi trong DB tồn tại? ${existsInDB}`);
  }

  // Đóng pool DB
  await pool.end();
  console.log('\nĐã đóng kết nối database.');
}

run();
