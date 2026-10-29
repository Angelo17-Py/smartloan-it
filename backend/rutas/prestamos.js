// Rutas para gestión de préstamos de equipos
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/prestamosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Crea un nuevo préstamo (cualquier usuario autenticado)
router.post('/',    verificarToken, apiLimiter, c.crear);
// Lista todos los préstamos
router.get('/',     verificarToken, c.listar);
// Alertas de vencimiento (préstamos vencidos o por vencer en las próximas 48 horas)
router.get('/alertas', verificarToken, c.alertas);
// Busca un préstamo por ID (para el comprobante)
router.get('/:id',  verificarToken, c.buscar);
// Elimina un préstamo (solo admin)
router.delete('/:id', verificarToken, requireAdmin, apiLimiter, c.eliminar);

module.exports = router;
