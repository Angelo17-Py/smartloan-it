const express = require('express');
const router  = express.Router();
const c       = require('../controladores/configuracionControlador');
const { verificarToken } = require('../middleware/auth');
const { configLimiter } = require('../middleware/rateLimiters');

router.get('/',   verificarToken, c.listar);
router.put('/:clave', verificarToken, configLimiter, c.actualizar);

module.exports = router;
