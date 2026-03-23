const express = require('express');
const router = express.Router();
const c = require('../controladores/usuariosControlador');

router.post('/', c.crear);
router.get('/', c.listar);
router.post('/login', c.login);

module.exports = router;