const express = require('express');
const { body, param } = require('express-validator');
const aiAdvisorController = require('../controllers/aiAdvisorController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value) {
  if (!datePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const chatRules = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message must be at most 2000 characters'),
  body('conversation_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Conversation id is invalid')
    .toInt(),
  body('selected_date')
    .optional({ nullable: true })
    .custom(isValidDateOnly)
    .withMessage('Selected date must use YYYY-MM-DD'),
  body('date_range')
    .optional({ nullable: true })
    .isObject()
    .withMessage('Date range is invalid'),
  body('date_range.from')
    .if(body('date_range').exists({ values: 'null' }))
    .custom(isValidDateOnly)
    .withMessage('Date range from must use YYYY-MM-DD'),
  body('date_range.to')
    .if(body('date_range').exists({ values: 'null' }))
    .custom(isValidDateOnly)
    .withMessage('Date range to must use YYYY-MM-DD'),
];

const conversationIdRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Conversation id is invalid')
    .toInt(),
];

router.use(authenticate);

router.post('/chat', chatRules, validate, aiAdvisorController.chat);
router.get('/conversations', aiAdvisorController.getConversations);
router.get('/conversations/:id/messages', conversationIdRules, validate, aiAdvisorController.getMessages);

module.exports = router;
