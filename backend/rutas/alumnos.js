// Rutas para gestión de alumnos
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/alumnosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Lista alumnos disponibles para préstamo (sin paginación, filtrados)
router.get('/disponibles',   verificarToken, c.disponibles);
// Lista completa de alumnos con paginación y búsqueda
router.get('/',              verificarToken, c.listar);
// Crea un alumno nuevo (cualquier usuario autenticado)
router.post('/',             verificarToken, apiLimiter, c.crear);
// Elimina un alumno (solo admin)
router.delete('/:id',        verificarToken, requireAdmin, apiLimiter, c.eliminar);
// Edita datos de un alumno (cualquier usuario autenticado)
router.put('/:id',           verificarToken, apiLimiter, c.editar);
// Historial de préstamos de un alumno específico
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
