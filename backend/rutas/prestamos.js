/* Rutas para prestamos*/

const express = require('express');
const router  = express.Router();
const c       = require('../controladores/prestamosControlador');
router.post('/',   c.crear);
router.get('/',    c.listar);
router.get('/:id', c.buscar);
module.exports = router;
