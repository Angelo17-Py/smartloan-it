const express = require('express');
const router  = express.Router();
const c       = require('../controladores/devolucionesControlador');
const { verificarToken } = require('../middleware/auth');

router.post('/', verificarToken, c.crear);
router.get('/',  verificarToken, c.listar);

module.exports = router;
