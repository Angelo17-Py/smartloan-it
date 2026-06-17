const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const c       = require('../controladores/configuracionControlador');
const { verificarToken } = require('../middleware/auth');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/',   verificarToken, c.listar);
router.put('/:clave', verificarToken, apiLimiter, c.actualizar);

module.exports = router;
