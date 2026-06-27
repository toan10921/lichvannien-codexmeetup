const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    const validationError = new AppError('Validation failed', 422);
    validationError.errors = formatted;
    return next(validationError);
  }

  next();
}

module.exports = { validate };
