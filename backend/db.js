// Conexión a MySQL usando un pool de conexiones para manejar varias solicitudes simultáneas
// Soporta múltiples nombres de variables de entorno para flexibilidad en distintos entornos
const mysql = require('mysql2/promise');

const host     = process.env.MYSQLHOST     || process.env.MYSQL_HOST     || process.env.DB_HOST     || 'localhost';
const port     = parseInt(process.env.MYSQLPORT     || process.env.MYSQL_PORT     || process.env.DB_PORT     || '3306', 10);
const user     = process.env.MYSQLUSER     || process.env.MYSQL_USER     || process.env.DB_USER     || 'root';
const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '1234';
const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME     || 'prestamos_db';

if (!process.env.MYSQLPASSWORD && !process.env.MYSQL_PASSWORD && !process.env.DB_PASSWORD) {
  console.warn('ADVERTENCIA: No se definió contraseña de MySQL. Usando valor por defecto (solo para desarrollo local).');
}

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,  // Espera si todas las conexiones están ocupadas
  connectionLimit: 10,        // Máximo 10 conexiones simultáneas
  queueLimit: 0,              // Sin límite de cola
  dateStrings: true           // Las fechas llegan como string en vez de objeto Date
});

// Verificamos la conexión al arrancar
pool.getConnection().then(conn => {
  console.log('MySQL conectado en ' + host + ':' + port);
  conn.release();
}).catch(err => {
  console.error('Error conexión:', err.message);
});

module.exports = pool;
