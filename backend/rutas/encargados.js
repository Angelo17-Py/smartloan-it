// Rutas para autenticación y consulta de encargados
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiters');

// Inicio de sesión (con límite de intentos)
router.post('/login', loginLimiter, c.login);
// Lista todos los encargados (requiere autenticación)
router.get('/',       verificarToken, c.listar);

module.exports = router;
