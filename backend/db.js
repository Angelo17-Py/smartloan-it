/* Para el manejo de la base de datos MySQL */

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '1234',
  database: 'prestamos_db'
});

db.connect(err => {
  if (err) { console.error('Error conexión:', err); return; }
  console.log('MySQL conectado');
});

module.exports = db;
