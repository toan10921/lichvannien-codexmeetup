const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.jwt.secret);

    if (!payload.sub) {
      throw new Error('Missing token subject');
    }

    req.user = {
      id: payload.sub,
      email: payload.email || null,
    };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

module.exports = { authenticate };
