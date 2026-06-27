const express = require('express');
const { body, param } = require('express-validator');
const planningController = require('../controllers/planningController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const createPlanningRules = [
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
  body('category')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Category must be a string'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority is invalid'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 30, max: 720 })
    .withMessage('duration_minutes must be between 30 and 720')
    .toInt(),
  body('earliest_date')
    .notEmpty()
    .withMessage('earliest_date is required')
    .isString()
    .withMessage('earliest_date must be a string'),
  body('latest_date')
    .notEmpty()
    .withMessage('latest_date is required')
    .isString()
    .withMessage('latest_date must be a string'),
  body('preferred_time_of_day')
    .optional()
    .isIn(['any', 'morning', 'afternoon', 'evening'])
    .withMessage('preferred_time_of_day is invalid'),
  body('avoid_weekends')
    .optional()
    .isBoolean()
    .withMessage('avoid_weekends must be a boolean')
    .toBoolean(),
  body('prefer_good_day')
    .optional()
    .isBoolean()
    .withMessage('prefer_good_day must be a boolean')
    .toBoolean(),
  body('is_all_day')
    .optional()
    .isBoolean()
    .withMessage('is_all_day must be a boolean')
    .toBoolean(),
];

const planningIdRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Planning item id is invalid')
    .toInt(),
];

const confirmRules = [
  ...planningIdRules,
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

router.use(authenticate);

router.get('/timeline', planningController.getTimeline);
router.post('/items', createPlanningRules, validate, planningController.createPlanningItem);
router.post('/items/:id/suggestions', planningIdRules, validate, planningController.suggestPlanningItem);
router.post('/items/:id/confirm', confirmRules, validate, planningController.confirmPlanningItem);
router.delete('/items/:id', planningIdRules, validate, planningController.deletePlanningItem);

module.exports = router;
