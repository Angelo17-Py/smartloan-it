// Rutas para gestión de equipos tecnológicos
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/equiposControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Lista todos los equipos
router.get('/',              verificarToken, c.listar);
// Crea un equipo nuevo (solo admin)
router.post('/',             verificarToken, requireAdmin, apiLimiter, c.crear);
// Elimina un equipo (solo admin)
router.delete('/:id',        verificarToken, requireAdmin, apiLimiter, c.eliminar);
// Edita datos de un equipo (solo admin)
router.put('/:id',           verificarToken, requireAdmin, apiLimiter, c.editar);
// Cambia el estado de un equipo (Disponible/Prestado/En mantenimiento)
router.patch('/:id/estado',  verificarToken, requireAdmin, apiLimiter, c.cambiarEstado);
// Historial de préstamos de un equipo específico
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
