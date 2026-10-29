// Rutas para autenticación y administración de encargados
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { loginLimiter, apiLimiter } = require('../middleware/rateLimiters');

// Inicio de sesión con límite de intentos fallidos
router.post('/login', loginLimiter, c.login);
// Cierre de sesión: elimina la cookie httpOnly
router.post('/logout', (req, res) => {
  res.clearCookie('sl_token', { path: '/' });
  res.json({ mensaje: 'Sesión cerrada' });
});
// Lista todos los encargados, activos e inactivos (solo admin)
router.get('/',              verificarToken, requireAdmin, c.listar);
// Crea un usuario nuevo (solo admin)
router.post('/',             verificarToken, requireAdmin, apiLimiter, c.crear);
// Edita datos, rol y contraseña de un usuario (solo admin)
router.put('/:id',           verificarToken, requireAdmin, apiLimiter, c.editar);
// Activa o desactiva un usuario (solo admin)
router.patch('/:id/estado',  verificarToken, requireAdmin, apiLimiter, c.cambiarEstado);

module.exports = router;
