// Rutas de auditoría.
// Solo administradores: verificarToken valida la sesión y requireAdmin exige
// el rol, porque el registro expone actividad de todos los usuarios.
const express = require('express');
const router = express.Router();
const db = require('../db');
const { verificarToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Lista las acciones registradas (solo administradores).
router.get('/', verificarToken, requireAdmin, async (req, res) => {
  try {
    // El límite se normaliza a un entero entre 1 y 500 antes de interpolarlo en el SQL.
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 200;
    if (limit > 500) limit = 500;
    const conn = await db;
    const [rows] = await conn.query(
      `SELECT a.id_auditoria, a.id_encargado, a.codigo_encargado,
         e.nombre AS encargado_nombre, e.apellido AS encargado_apellido,
         a.accion, a.entidad, a.id_entidad, a.detalle, a.fecha
       FROM auditoria a
       LEFT JOIN encargados e ON a.id_encargado = e.id_encargado
       ORDER BY a.fecha DESC, a.id_auditoria DESC
       LIMIT ${limit}`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;
