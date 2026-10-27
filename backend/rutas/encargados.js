// Rutas para autenticación y consulta de encargados
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiters');

// Inicio de sesión con límite de intentos fallidos
router.post('/login', loginLimiter, c.login);
// Cierre de sesión: elimina la cookie httpOnly
router.post('/logout', (req, res) => {
  res.clearCookie('sl_token', { path: '/' });
  res.json({ mensaje: 'Sesión cerrada' });
});
// Lista todos los encargados (requiere autenticación)
router.get('/',       verificarToken, c.listar);

module.exports = router;
