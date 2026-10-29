// Rutas para registro de devoluciones de equipos
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/devolucionesControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Registra una nueva devolución (cualquier usuario autenticado)
router.post('/',    verificarToken, apiLimiter, c.crear);
// Lista todas las devoluciones
router.get('/',     verificarToken, c.listar);
// Elimina una devolución (solo admin)
router.delete('/:id', verificarToken, requireAdmin, apiLimiter, c.eliminar);

module.exports = router;
