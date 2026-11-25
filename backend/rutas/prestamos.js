// Rutas de préstamos de equipos.
// Las lecturas solo requieren sesión; las escrituras usan apiLimiter y la
// anulación exige admin. requireAdmin siempre va después de verificarToken
// porque consulta el rol ya cargado en req.encargado.
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/prestamosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { apiLimiter } = require('../middleware/rateLimiters');

// Alta de préstamo: cualquier usuario autenticado, con límite de tasa.
router.post('/',    verificarToken, apiLimiter, c.crear);
// Listado de todos los préstamos.
router.get('/',     verificarToken, c.listar);
// Debe declararse antes de /:id; si no, "alertas" se interpretaría como un ID.
router.get('/alertas', verificarToken, c.alertas);
// Comprobante de un préstamo activo.
router.get('/:id',  verificarToken, c.buscar);
// Extiende el vencimiento de un préstamo activo: cualquier usuario autenticado.
router.patch('/:id/plazo', verificarToken, apiLimiter, c.extender);
// Anulación lógica con motivo: solo admin. No borra el registro.
router.patch('/:id/anular', verificarToken, requireAdmin, apiLimiter, c.anular);

module.exports = router;
