/* Rutas para alumnos*/ 

const express = require('express');
const router  = express.Router();
const c       = require('../controladores/alumnosControlador');

router.get('/disponibles',   c.disponibles);
router.get('/',              c.listar);
router.post('/',             c.crear);
router.delete('/:id',        c.eliminar);
router.put('/:id',           c.editar);
router.get('/:id/historial', c.historial);

module.exports = router;