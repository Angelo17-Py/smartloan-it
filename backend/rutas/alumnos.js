const express = require('express');
const router  = express.Router();
const c       = require('../controladores/alumnosControlador');
router.get('/',              c.listar);
router.post('/',             c.crear);
router.delete('/:id',        c.eliminar);
router.get('/:id/historial', c.historial);
module.exports = router;
