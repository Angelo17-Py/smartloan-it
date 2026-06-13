const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');

router.post('/login', c.login);
router.get('/',       verificarToken, c.listar);

module.exports = router;
