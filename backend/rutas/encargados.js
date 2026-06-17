const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiters');

router.post('/login', loginLimiter, c.login);
router.get('/',       verificarToken, c.listar);

module.exports = router;
