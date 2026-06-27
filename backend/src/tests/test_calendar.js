/**
 * Test script kiểm tra tính chính xác của âm dương lịch & Can Chi
 */
const path = require('path');
// Thiết lập biến môi trường mock
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'lunar_user';
process.env.DB_PASSWORD = 'lunar_password';
process.env.DB_NAME = 'lunar_calendar_mvp';
process.env.JWT_SECRET = 'dev-secret-change-in-production';

const calendarService = require('../services/calendarService');
const { pool } = require('../config/db');

async function run() {
  console.log('=== [Kịch bản 1] Bắt đầu kiểm tra Âm dương lịch & Can Chi ===');
  
  const testCases = [
    { solar: '2026-06-27', expectedLunar: '13/5 âm lịch', expectedCanChi: 'Nhâm Thân' },
    { solar: '2026-02-17', expectedLunar: '1/1 âm lịch', expectedCanChi: 'Nhâm Tuất' }, // Mùng 1 Tết Bính Ngọ 2026
    { solar: '2026-05-31', expectedLunar: '15/4 âm lịch', expectedCanChi: 'Ất Tỵ' }  // Ngày rằm tháng 4
  ];

  let successCount = 0;

  for (const tc of testCases) {
    try {
      const detail = await calendarService.getDayDetail(tc.solar, null);
      
      const lunarOk = detail.lunar_date === tc.expectedLunar;
      const canChiOk = detail.can_chi_day.includes(tc.expectedCanChi);
      const extraFieldsOk = Boolean(
        detail.day_quality?.label &&
        detail.day_element?.label &&
        detail.conflict_age?.label &&
        Array.isArray(detail.good_hours) &&
        detail.good_hours.length > 0
      );

      if (lunarOk && canChiOk && extraFieldsOk) {
        console.log(`[PASS] Ngày dương: ${tc.solar} -> Âm: ${detail.lunar_date}, Can Chi: ${detail.can_chi_day}`);
        successCount++;
      } else {
        console.log(`[FAIL] Ngày dương: ${tc.solar}`);
        console.log(`  Mong muốn: Âm lịch: ${tc.expectedLunar}, Can Chi chứa: ${tc.expectedCanChi}`);
        console.log(`  Thực tế: Âm lịch: ${detail.lunar_date}, Can Chi: ${detail.can_chi_day}`);
        console.log(`  Trường mở rộng hợp lệ? ${extraFieldsOk}`);
      }
    } catch (error) {
      console.log(`[ERROR] Lỗi khi test ngày ${tc.solar}:`, error.message);
    }
  }

  console.log(`\nKết quả: Đã vượt qua ${successCount}/${testCases.length} trường hợp.`);
  
  // Đóng pool DB
  await pool.end();
  console.log('Đã đóng kết nối database.');
}

run();
