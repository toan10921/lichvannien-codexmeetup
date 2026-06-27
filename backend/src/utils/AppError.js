class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.assign(this, options);
  }
}

module.exports = AppError;
