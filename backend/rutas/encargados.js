const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { mensaje: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, c.login);
router.get('/',       verificarToken, c.listar);

module.exports = router;
