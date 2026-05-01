const db = require('../db');

// LOGIN con código numérico + contraseña texto plano
exports.login = (req, res) => {
  const { codigo, password } = req.body;
  if (!codigo || !password)
    return res.status(400).json({ mensaje: 'Código y contraseña requeridos' });

  db.query(
    'SELECT * FROM encargados WHERE codigo = ? AND password = ? AND estado = 1',
    [codigo.trim(), password],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0)
        return res.status(401).json({ mensaje: 'Código o contraseña incorrectos' });

      // No devolver la contraseña al frontend
      const { password: _, ...datos } = result[0];
      res.json(datos);
    }
  );
};

// LISTAR encargados
exports.listar = (req, res) => {
  db.query(
    'SELECT id_encargado, codigo, nombre, apellido, cargo, estado, fecha_registro FROM encargados WHERE estado = 1 ORDER BY codigo',
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
};

// CREAR encargado
exports.crear = (req, res) => {
  const { codigo, password, nombre, apellido, cargo } = req.body;
  if (!codigo || !password || !nombre || !apellido)
    return res.status(400).json({ mensaje: 'Todos los campos son requeridos' });

  if (codigo.length > 4)
    return res.status(400).json({ mensaje: 'El código debe tener máximo 4 dígitos' });

  db.query(
    'INSERT INTO encargados (codigo, password, nombre, apellido, cargo) VALUES (?, ?, ?, ?, ?)',
    [codigo.trim(), password, nombre, apellido, cargo || 'Encargado de Recursos Tecnológicos'],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(400).json({ mensaje: 'Ese código ya existe' });
        return res.status(500).json(err);
      }
      res.json({ mensaje: 'Encargado creado', codigo });
    }
  );
};
