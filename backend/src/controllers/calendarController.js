const calendarService = require('../services/calendarService');

/**
 * API lấy tổng quan lịch tháng
 * GET /api/calendar/month?year=2026&month=7
 */
async function getMonth(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    
    // Lấy year, month từ query hoặc mặc định thời gian hiện tại
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Tháng không hợp lệ. Phải từ 1 đến 12.'
      });
    }

    const data = await calendarService.getMonthOverview(year, month, userId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * API lấy chi tiết thông tin một ngày
 * GET /api/calendar/day?date=2026-07-15
 */
async function getDay(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    
    // Lấy date từ query hoặc mặc định ngày hiện tại
    let dateStr = req.query.date;
    if (!dateStr) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    // Validate định dạng YYYY-MM-DD đơn giản
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.'
      });
    }

    const data = await calendarService.getDayDetail(dateStr, userId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMonth,
  getDay
};
