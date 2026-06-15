const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query('SELECT * FROM configuracion');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { valor } = req.body;
    const limpio = String(valor).replace(/\./g, '');
    const valNum = parseInt(limpio, 10);
    if (!valor || isNaN(valNum) || valNum < 0) {
      return res.status(400).json({ mensaje: 'Valor inválido. Debe ser un número positivo' });
    }
    const conn = await db;
    await conn.query('UPDATE configuracion SET valor=? WHERE clave=?', [String(valNum), req.params.clave]);
    res.json({ mensaje: 'Configuracion actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
