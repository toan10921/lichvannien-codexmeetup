require('dotenv').config();

function readOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY || '';

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return '';
  }

  return apiKey;
}

const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'lunar_user',
    password: process.env.DB_PASSWORD || 'lunar_password',
    database: process.env.DB_NAME || 'lunar_calendar_mvp',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openai: {
    apiKey: readOpenAiApiKey(),
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  },
};

if (env.nodeEnv === 'production' && env.jwt.secret === 'dev-secret-change-in-production') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
