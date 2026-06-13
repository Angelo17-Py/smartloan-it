const express = require('express');
const router  = express.Router();
const c       = require('../controladores/equiposControlador');
const { verificarToken } = require('../middleware/auth');

router.get('/',              verificarToken, c.listar);
router.post('/',             verificarToken, c.crear);
router.delete('/:id',        verificarToken, c.eliminar);
router.put('/:id',           verificarToken, c.editar);
router.patch('/:id/estado',  verificarToken, c.cambiarEstado);
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
