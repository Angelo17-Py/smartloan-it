// Rutas de alumnos.
// Orden de middlewares: verificarToken autentica y carga req.encargado antes de
// llegar al controlador; requireAdmin va después porque depende de ese dato.
// apiLimiter se aplica solo a escrituras para frenar abuso sin limitar las lecturas.
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/alumnosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Alumnos sin préstamo activo, usados por el formulario de nuevo préstamo.
router.get('/disponibles',   verificarToken, c.disponibles);
// Listado completo de alumnos activos.
router.get('/',              verificarToken, c.listar);
// Alta de alumno: cualquier usuario autenticado, con límite de tasa.
router.post('/',             verificarToken, apiLimiter, c.crear);
// Baja lógica: solo admin; el límite se consume únicamente si pasó el permiso.
router.delete('/:id',        verificarToken, requireAdmin, apiLimiter, c.eliminar);
// Edición de datos: cualquier usuario autenticado.
router.put('/:id',           verificarToken, apiLimiter, c.editar);
// Historial de préstamos del alumno.
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
