const express = require('express');
const router  = express.Router();
const c       = require('../controladores/prestamosControlador');
const { verificarToken } = require('../middleware/auth');

router.post('/',    verificarToken, c.crear);
router.get('/',     verificarToken, c.listar);
router.get('/:id',  verificarToken, c.buscar);
router.delete('/:id', verificarToken, c.eliminar);

module.exports = router;
