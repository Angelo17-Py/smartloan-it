const mysql = require('mysql2/promise');

const host     = process.env.MYSQL_HOST     || process.env.DB_HOST     || 'localhost';
const port     = parseInt(process.env.MYSQL_PORT     || process.env.DB_PORT     || '3306', 10);
const user     = process.env.MYSQL_USER     || process.env.DB_USER     || 'root';
const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '1234';
const database = process.env.MYSQL_DATABASE || process.env.DB_NAME     || 'prestamos_db';

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

pool.getConnection().then(conn => {
  console.log('MySQL conectado en ' + host + ':' + port);
  conn.release();
}).catch(err => {
  console.error('Error conexión:', err.message);
});

module.exports = pool;
