const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+07:00',
});

async function testConnection() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
}

module.exports = { pool, testConnection };
