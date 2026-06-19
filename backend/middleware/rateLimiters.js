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

// Límite estricto para login: máximo 5 intentos cada 15 minutos (evita fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { mensaje: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
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

module.exports = { apiLimiter, loginLimiter, configLimiter };
