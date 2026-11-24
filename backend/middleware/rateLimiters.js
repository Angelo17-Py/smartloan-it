// Limitadores de tasa para proteger las rutas de abuso y fuerza bruta.
// express-rate-limit lleva un contador por IP dentro de cada ventana de tiempo.
const rateLimit = require('express-rate-limit');

// Límite general de la API. Es amplio porque cubre la navegación normal de la aplicación.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite más estricto para configuración: modifica parámetros globales del sistema.
const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite de intentos de inicio de sesión. Con skipSuccessfulRequests, los accesos
// correctos no consumen cuota: solo cuentan los intentos fallidos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, configLimiter, loginLimiter };
