const express = require('express');
const router  = express.Router();
const c       = require('../controladores/alumnosControlador');
const { verificarToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiters');

router.get('/disponibles',   verificarToken, c.disponibles);
router.get('/',              verificarToken, c.listar);
router.post('/',             verificarToken, apiLimiter, c.crear);
router.delete('/:id',        verificarToken, apiLimiter, c.eliminar);
router.put('/:id',           verificarToken, apiLimiter, c.editar);
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
