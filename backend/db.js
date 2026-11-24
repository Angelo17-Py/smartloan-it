// Conexión a MySQL mediante un pool: reutiliza conexiones y admite solicitudes
// concurrentes sin abrir una conexión nueva por cada consulta.
// Se aceptan varios nombres de variables de entorno para adaptarse a distintos entornos.
const mysql = require('mysql2/promise');

const host     = process.env.MYSQLHOST     || process.env.MYSQL_HOST     || process.env.DB_HOST     || 'localhost';
const port     = parseInt(process.env.MYSQLPORT     || process.env.MYSQL_PORT     || process.env.DB_PORT     || '3306', 10);
const user     = process.env.MYSQLUSER     || process.env.MYSQL_USER     || process.env.DB_USER     || 'root';
const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME     || 'prestamos_db';

// Se aborta el arranque sin contraseña: evita conectar con credenciales vacías por descuido.
if (!password) {
  console.error('Falta la contraseña de MySQL. Definí MYSQL_PASSWORD o DB_PASSWORD antes de iniciar el servidor.');
  process.exit(1);
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
  dateStrings: true           // Devuelve DATETIME como string y evita conversiones de zona horaria
});

// Verificamos la conexión al arrancar
pool.getConnection().then(conn => {
  console.log('MySQL conectado en ' + host + ':' + port);
  conn.release();
}).catch(err => {
  console.error('Error conexión:', err.message);
});

// El pool de mysql2 es "thenable": `await db` entrega una conexión del pool,
// por eso los módulos hacen `const conn = await db` antes de consultar.
module.exports = pool;
