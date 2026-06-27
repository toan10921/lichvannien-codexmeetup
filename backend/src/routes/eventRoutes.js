const express = require('express');
const { body, param, query } = require('express-validator');
const eventController = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const createEventRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title must be at most 150 characters'),
  body('description')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Description must be a string'),
  body('start_at')
    .notEmpty()
    .withMessage('start_at is required')
    .isString()
    .withMessage('start_at must be a string'),
  body('end_at')
    .optional({ values: 'null' })
    .isString()
    .withMessage('end_at must be a string'),
  body('is_all_day')
    .optional()
    .isBoolean()
    .withMessage('is_all_day must be a boolean')
    .toBoolean(),
];

const updateEventRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Event ID is invalid'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 })
    .withMessage('Title must be at most 150 characters'),
  body('description')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Description must be a string'),
  body('start_at')
    .optional()
    .isString()
    .withMessage('start_at must be a string'),
  body('end_at')
    .optional({ values: 'null' })
    .isString()
    .withMessage('end_at must be a string'),
  body('is_all_day')
    .optional()
    .isBoolean()
    .withMessage('is_all_day must be a boolean')
    .toBoolean(),
];

const listEventRules = [
  query('month')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('month must have format YYYY-MM'),
];

const eventIdRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Event ID is invalid'),
];

router.use(authenticate);

router.get('/', listEventRules, validate, eventController.listEvents);
router.post('/', createEventRules, validate, eventController.createEvent);
router.put('/:id', updateEventRules, validate, eventController.updateEvent);
router.delete('/:id', eventIdRules, validate, eventController.deleteEvent);

module.exports = router;
