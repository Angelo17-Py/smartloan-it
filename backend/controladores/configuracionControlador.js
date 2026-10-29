const db = require('../db');
const auditoria = require('../utils/auditoria');

// Obtiene todas las configuraciones del sistema (multa por día, etc.)
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

// Actualiza el valor de una configuración por su clave
exports.actualizar = async (req, res) => {
  try {
    const { valor } = req.body;
    if (valor === null || valor === undefined || valor === '') {
      return res.status(400).json({ mensaje: 'Valor inválido. Debe ser un número positivo' });
    }
    // Limpiamos el formato: sacamos puntos de miles y reemplazamos coma por punto decimal
    const limpio = String(valor).replace(/\./g, '').replace(/,/g, '.');
    const valNum = parseFloat(limpio);
    if (isNaN(valNum) || valNum < 0) {
      return res.status(400).json({ mensaje: 'Valor inválido. Debe ser un número positivo' });
    }
    const conn = await db;
    // Verificamos que la clave exista y guardamos el valor anterior
    const [existing] = await conn.query('SELECT valor FROM configuracion WHERE clave=?', [req.params.clave]);
    if (existing.length === 0) {
      return res.status(404).json({ mensaje: 'La clave de configuración no existe' });
    }
    const valorAnterior = existing[0].valor;
    const valorNuevo = String(Math.round(valNum));
    await conn.query('UPDATE configuracion SET valor=? WHERE clave=?', [valorNuevo, req.params.clave]);
    auditoria.registrar(req, {
      accion: 'EDITAR',
      entidad: 'configuracion',
      id_entidad: req.params.clave,
      detalle: `Valor: ${valorAnterior} → ${valorNuevo}`
    });
    res.json({ mensaje: 'Configuración actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
