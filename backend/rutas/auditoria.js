// Rutas para consultar el registro de auditoría del sistema
const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Lista las acciones registradas (solo administradores)
router.get('/', verificarToken, requireAdmin, async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 200;
    if (limit > 500) limit = 500;
    const conn = await db;
    const [rows] = await conn.query(
      `SELECT id_auditoria, id_encargado, codigo_encargado, accion, entidad, id_entidad, detalle, ip, fecha
       FROM auditoria
       ORDER BY fecha DESC, id_auditoria DESC
       LIMIT ${limit}`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
