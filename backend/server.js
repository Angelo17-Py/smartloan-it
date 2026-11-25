// Punto de entrada del servidor Express de SmartLoanIT
console.log('Iniciando SmartLoanIT...');
// Carga .env antes de importar módulos que leen variables de entorno al inicializarse.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
const errorHandler = require('./middleware/errorHandler');
const { verificarToken } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimiters');
const initDatabase = require('./initDb');
const exportarExcel = require('./controladores/exportarControlador');

// Atrapa promesas no manejadas para que no tumben el servidor
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 1002;

// Oculta la cabecera X-Powered-By para no revelar el framework usado.
app.disable('x-powered-by');
// Necesario si la app corre detrás de un proxy (Railway, Nginx, etc.);
// sin esto req.ip sería la IP del proxy y el rate limiting no distinguiría clientes.
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// CORS cerrado por defecto: mismo origen. Configurar CORS_ORIGIN para frontends externos.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(function(origin) { return origin.trim(); })
  .filter(Boolean);

// Cabeceras de seguridad globales: mitigan sniffing de tipo MIME, clickjacking,
// fuga de referrer y acceso a cámara, micrófono o ubicación.
app.use(function(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Sin Origin: navegación normal o petición del mismo servidor
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
// Limita el tamaño del body JSON para evitar consumos de memoria por cargas enormes.
app.use(express.json({ limit: '100kb' }));

// Sirve el frontend desde ../frontend; si el archivo no existe, la petición continúa
// hacia las rutas de la API montadas más abajo.
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta raíz redirige al login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Endpoint de salud para monitoreo
app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'SmartLoanIT', timestamp: new Date().toISOString() });
});

// Montaje de las rutas de la API
app.use('/encargados',   require('./rutas/encargados'));
app.use('/alumnos',      require('./rutas/alumnos'));
app.use('/equipos',      require('./rutas/equipos'));
app.use('/prestamos',    require('./rutas/prestamos'));
app.use('/devoluciones', require('./rutas/devoluciones'));
app.use('/configuracion', require('./rutas/configuracion'));
app.use('/auditoria',    require('./rutas/auditoria'));

/**
 * Exporta préstamos y devoluciones a un libro Excel.
 * Requiere sesión válida y escribe el archivo en streaming sobre la respuesta
 * para no duplicar en memoria el libro completo.
 */
// Exportación de préstamos y devoluciones a Excel.
app.get('/exportar', verificarToken, exportarExcel);
// Exportación filtrada desde el Historial: recibe los IDs visibles.
app.post('/exportar', verificarToken, apiLimiter, exportarExcel);

// Ruta comodín para endpoints inexistentes: responde JSON antes del manejador de errores.
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// El manejador de errores se registra al final para recibir los next(err) de todo lo anterior.
app.use(errorHandler);

/**
 * Inicializa el esquema de la base de datos y luego pone el servidor a escuchar.
 * Si la inicialización falla se aborta el arranque para no operar con el esquema incompleto.
 */
async function start() {
  try {
    await initDatabase();
  } catch (err) {
    console.error('Error al inicializar BD:', err.message);
    process.exit(1);
  }
  const server = app.listen(PORT, () => {
    console.log(`SmartLoanIT corriendo en puerto ${PORT}`);
  });

  // Cierre graceful: deja de aceptar conexiones, cierra el pool de MySQL y termina.
  function shutdown(signal) {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(() => {
      console.log('Servidor HTTP cerrado.');
      db.end().then(() => {
        console.log('Pool de MySQL cerrado.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error al cerrar MySQL:', err.message);
        process.exit(1);
      });
    });
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}
start();
