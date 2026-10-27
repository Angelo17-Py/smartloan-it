// Limitadores de tasa (rate limiting) para proteger rutas de abuso
const rateLimit = require('express-rate-limit');

// Límite general para APIs: máximo 30 solicitudes cada 15 minutos
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite para rutas de configuración: máximo 15 solicitudes cada 15 minutos
const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite de intentos fallidos de inicio de sesión: máximo 10 cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, configLimiter, loginLimiter };
