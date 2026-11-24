// Controlador de configuración: parámetros globales como la multa por día de retraso.
const db = require('../db');
const auditoria = require('../utils/auditoria');

/**
 * Lista todas las configuraciones del sistema.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de claves y valores.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query('SELECT * FROM configuracion');
  res.json(rows);
};

/**
 * Actualiza el valor de una configuración por su clave.
 * @param {import('express').Request} req Body: valor; parámetro :clave.
 * @param {import('express').Response} res Confirmación o error de validación.
 * @returns {Promise<void>}
 */
exports.actualizar = async (req, res) => {
  const { valor } = req.body;
  if (valor === null || valor === undefined || valor === '') {
    return res.status(400).json({ mensaje: 'Valor inválido. Debe ser un número positivo' });
  }
  const limpio = String(valor).replace(/\./g, '').replace(/,/g, '.');
  const valNum = parseFloat(limpio);
  if (isNaN(valNum) || valNum < 0) {
    return res.status(400).json({ mensaje: 'Valor inválido. Debe ser un número positivo' });
  }

  const conn = await db;
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
};
