const express = require('express');
const router  = express.Router();
const c       = require('../controladores/equiposControlador');
const { verificarToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiters');

router.get('/',              verificarToken, c.listar);
router.post('/',             verificarToken, apiLimiter, c.crear);
router.delete('/:id',        verificarToken, apiLimiter, c.eliminar);
router.put('/:id',           verificarToken, apiLimiter, c.editar);
router.patch('/:id/estado',  verificarToken, apiLimiter, c.cambiarEstado);
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
