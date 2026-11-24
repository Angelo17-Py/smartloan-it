// Rutas de autenticación y administración de encargados.
// /login es pública y usa loginLimiter antes del controlador para bloquear la
// fuerza bruta; el resto exige verificarToken y, las de gestión, requireAdmin
// (siempre después de autenticar porque dependen de req.encargado).
const express = require('express');
const router  = express.Router();
const c       = require('../controladores/encargadosControlador');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { loginLimiter, apiLimiter } = require('../middleware/rateLimiters');

// Inicio de sesión: limita intentos fallidos (los exitosos no cuentan).
router.post('/login', loginLimiter, c.login);
// Cierre de sesión: requiere sesión válida para revocar los tokens del usuario.
router.post('/logout', verificarToken, c.logout);
// Listado de usuarios: solo admin.
router.get('/',              verificarToken, requireAdmin, c.listar);
// Alta de usuario: solo admin, con límite de tasa.
router.post('/',             verificarToken, requireAdmin, apiLimiter, c.crear);
// Edición de datos, rol y contraseña: solo admin.
router.put('/:id',           verificarToken, requireAdmin, apiLimiter, c.editar);
// Activación/desactivación: solo admin; el rate limit se aplica tras el permiso.
router.patch('/:id/estado',  verificarToken, requireAdmin, apiLimiter, c.cambiarEstado);

module.exports = router;
