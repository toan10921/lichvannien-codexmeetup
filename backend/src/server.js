const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');

const MAX_DB_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

async function waitForDatabase() {
  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt += 1) {
    try {
      await testConnection();
      console.log('Database connected');
      return;
    } catch (error) {
      console.log(`Database not ready (attempt ${attempt}/${MAX_DB_RETRIES})`);

      if (attempt === MAX_DB_RETRIES) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_DELAY_MS);
      });
    }
  }
}

async function startServer() {
  await waitForDatabase();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
