// Rutas para gestión de equipos tecnológicos
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/equiposControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Lista todos los equipos
router.get('/',              verificarToken, c.listar);
// Lista solo equipos disponibles para préstamo
router.get('/disponibles',   verificarToken, c.disponibles);
// Crea un equipo nuevo (cualquier usuario autenticado)
router.post('/',             verificarToken, apiLimiter, c.crear);
// Elimina un equipo (solo admin)
router.delete('/:id',        verificarToken, requireAdmin, apiLimiter, c.eliminar);
// Edita datos de un equipo (cualquier usuario autenticado)
router.put('/:id',           verificarToken, apiLimiter, c.editar);
// Cambia el estado de un equipo (Disponible/Prestado/En mantenimiento)
router.patch('/:id/estado',  verificarToken, apiLimiter, c.cambiarEstado);
// Historial de préstamos de un equipo específico
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
