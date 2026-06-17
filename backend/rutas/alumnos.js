const express = require('express');
const router  = express.Router();
const c       = require('../controladores/alumnosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

router.get('/disponibles',   verificarToken, c.disponibles);
router.get('/',              verificarToken, c.listar);
router.post('/',             verificarToken, requireAdmin, apiLimiter, c.crear);
router.delete('/:id',        verificarToken, requireAdmin, apiLimiter, c.eliminar);
router.put('/:id',           verificarToken, requireAdmin, apiLimiter, c.editar);
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
