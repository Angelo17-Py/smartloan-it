const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const c       = require('../controladores/equiposControlador');
const { verificarToken } = require('../middleware/auth');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { mensaje: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/',              verificarToken, c.listar);
router.post('/',             verificarToken, apiLimiter, c.crear);
router.delete('/:id',        verificarToken, apiLimiter, c.eliminar);
router.put('/:id',           verificarToken, apiLimiter, c.editar);
router.patch('/:id/estado',  verificarToken, apiLimiter, c.cambiarEstado);
router.get('/:id/historial', verificarToken, c.historial);

module.exports = router;
