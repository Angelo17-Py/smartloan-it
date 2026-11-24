// Rutas de devoluciones de equipos.
// Todas exigen sesión; las escrituras pasan por apiLimiter, y la eliminación
// añade requireAdmin para evitar que un operador borre registros contables.
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/devolucionesControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Registra una devolución: cualquier usuario autenticado.
router.post('/',    verificarToken, apiLimiter, c.crear);
// Lista todas las devoluciones.
router.get('/',     verificarToken, c.listar);
// Elimina una devolución y revierte el préstamo: solo admin.
router.delete('/:id', verificarToken, requireAdmin, apiLimiter, c.eliminar);

module.exports = router;
