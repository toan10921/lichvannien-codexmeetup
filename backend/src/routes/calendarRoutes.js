const express = require('express');
const calendarController = require('../controllers/calendarController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Tất cả các route lịch đều yêu cầu đăng nhập
router.use(authenticate);

router.get('/month', calendarController.getMonth);
router.get('/day', calendarController.getDay);

module.exports = router;
