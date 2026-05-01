const express = require('express');
const router  = express.Router();
const c       = require('../controladores/equiposControlador');
router.get('/',              c.listar);
router.post('/',             c.crear);
router.delete('/:id',        c.eliminar);
router.patch('/:id/estado',  c.cambiarEstado);
router.get('/:id/historial', c.historial);
module.exports = router;
