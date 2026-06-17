const express = require('express');
const router  = express.Router();
const c       = require('../controladores/devolucionesControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

router.post('/',    verificarToken, requireAdmin, apiLimiter, c.crear);
router.get('/',     verificarToken, c.listar);
router.delete('/:id', verificarToken, requireAdmin, apiLimiter, c.eliminar);

module.exports = router;
