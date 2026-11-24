// Rutas de configuración del sistema (multa por día, etc.).
// Las lecturas solo requieren sesión; las escrituras exigen admin y usan un
// límite más estricto (configLimiter) por tratarse de parámetros globales.
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/configuracionControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { configLimiter } = require('../middleware/rateLimiters');

// Obtiene todas las configuraciones.
router.get('/',   verificarToken, c.listar);
// Actualiza una clave: requireAdmin después de autenticar; configLimiter al final.
router.put('/:clave', verificarToken, requireAdmin, configLimiter, c.actualizar);

module.exports = router;
