/* Rutas para encargados*/

const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
router.post('/login', c.login);
router.get('/',       c.listar);
module.exports = router;
