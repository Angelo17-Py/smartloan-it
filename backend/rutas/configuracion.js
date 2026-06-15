const express = require('express');
const router  = express.Router();
const c       = require('../controladores/configuracionControlador');
const { verificarToken } = require('../middleware/auth');

router.get('/',   verificarToken, c.listar);
router.put('/:clave', verificarToken, c.actualizar);

module.exports = router;
