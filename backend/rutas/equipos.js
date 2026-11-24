// Rutas de equipos tecnológicos.
// Todas exigen sesión. Las escrituras usan apiLimiter; la eliminación añade
// requireAdmin después de verificarToken porque el middleware de rol necesita
// que la autenticación ya haya cargado req.encargado.
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/equiposControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Inventario completo.
router.get('/',              verificarToken, c.listar);
// Solo equipos con estado Disponible, para el formulario de préstamo.
router.get('/disponibles',   verificarToken, c.disponibles);
// Alta de equipo: cualquier usuario autenticado.
router.post('/',             verificarToken, apiLimiter, c.crear);
// Baja de equipo: solo admin y solo si no tiene historial.
router.delete('/:id',        verificarToken, requireAdmin, apiLimiter, c.eliminar);
// Edición de datos: cualquier usuario autenticado.
router.put('/:id',           verificarToken, apiLimiter, c.editar);
// Cambio manual de estado (solo Disponible <-> En mantenimiento).
router.patch('/:id/estado',  verificarToken, apiLimiter, c.cambiarEstado);
// Historial de préstamos del equipo.
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
