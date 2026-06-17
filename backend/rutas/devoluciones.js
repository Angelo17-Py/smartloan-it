const express = require('express');
const router  = express.Router();
const c       = require('../controladores/devolucionesControlador');
const { verificarToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiters');

router.post('/',    verificarToken, apiLimiter, c.crear);
router.get('/',     verificarToken, c.listar);
router.delete('/:id', verificarToken, apiLimiter, c.eliminar);

module.exports = router;
