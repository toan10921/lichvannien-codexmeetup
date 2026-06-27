const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 12;

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function register({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (existingUsers.length > 0) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name.trim(), normalizedEmail, passwordHash]
  );

  const [rows] = await pool.execute(
    'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [result.insertId]
  );

  const user = rows[0];
  const token = createToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (rows.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = createToken(user);

  return {
    user: sanitizeUser(user),
    token,
  };
}

async function getProfile(userId) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  return sanitizeUser(rows[0]);
}

module.exports = {
  register,
  login,
  getProfile,
};
