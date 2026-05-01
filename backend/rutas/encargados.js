// rutas/encargados.js
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');

router.post('/login', c.login);
router.get('/',       c.listar);
router.post('/',      c.crear);

module.exports = router;
