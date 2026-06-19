// Rutas para configuración del sistema (multa por día, etc.)
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/configuracionControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { configLimiter } = require('../middleware/rateLimiters');

// Obtiene todas las configuraciones
router.get('/',   verificarToken, c.listar);
// Actualiza una configuración por su clave (solo admin)
router.put('/:clave', verificarToken, requireAdmin, configLimiter, c.actualizar);

module.exports = router;
