const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const c       = require('../controladores/devolucionesControlador');
const { verificarToken } = require('../middleware/auth');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/',    verificarToken, apiLimiter, c.crear);
router.get('/',     verificarToken, c.listar);
router.delete('/:id', verificarToken, apiLimiter, c.eliminar);

module.exports = router;
