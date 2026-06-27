const express = require('express');
const aiAdvisorController = require('../controllers/aiAdvisorController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Tất cả các route chatbot đều cần xác thực người dùng
router.use(authenticate);

router.post('/chat', aiAdvisorController.chat);
router.get('/conversations', aiAdvisorController.getConversations);
router.get('/conversations/:id/messages', aiAdvisorController.getMessages);

module.exports = router;
