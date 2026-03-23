const express = require('express');
const router = express.Router();
const c = require('../controladores/devolucionesControlador');

router.post('/', c.crear);

module.exports = router;