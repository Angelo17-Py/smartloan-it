// Inicialización de la base de datos: crea tablas, migraciones, triggers y datos de ejemplo
const db = require('./db');
const bcrypt = require('bcryptjs');

/**
 * Reintenta la conexión hasta que MySQL esté disponible.
 * Útil cuando el servidor y la base arrancan a la vez en contenedores separados.
 * @param {number} intentos Cantidad máxima de intentos.
 * @param {number} intervalo Espera en milisegundos entre intentos.
 * @throws {Error} Si se agotan los intentos sin conexión.
 */
async function esperarMySQL(intentos = 30, intervalo = 2000) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const conn = await db.getConnection();
      conn.release();
      console.log('MySQL conectado exitosamente');
      return;
    } catch (err) {
      console.log(`Esperando MySQL (intento ${i}/${intentos})...`);
      if (i === intentos) throw new Error('No se pudo conectar a MySQL: ' + err.message);
      await new Promise(r => setTimeout(r, intervalo));
    }
  }
}

/**
 * Indica si una columna ya existe en la tabla indicada.
 * @param {object} conn Conexión de MySQL.
 * @param {string} tabla Nombre de la tabla.
 * @param {string} columna Nombre de la columna.
 * @returns {Promise<boolean>}
 */
async function existeColumna(conn, tabla, columna) {
  const [filas] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tabla, columna]
  );
  return filas.length > 0;
}

/**
 * Indica si un índice ya existe en la tabla indicada.
 * @param {object} conn Conexión de MySQL.
 * @param {string} tabla Nombre de la tabla.
 * @param {string} indice Nombre del índice.
 * @returns {Promise<boolean>}
 */
async function existeIndice(conn, tabla, indice) {
  const [filas] = await conn.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [tabla, indice]
  );
  return filas.length > 0;
}

/**
 * Indica si una restricción ya existe en la tabla indicada.
 * @param {object} conn Conexión de MySQL.
 * @param {string} tabla Nombre de la tabla.
 * @param {string} restriccion Nombre de la restricción.
 * @returns {Promise<boolean>}
 */
async function existeRestriccion(conn, tabla, restriccion) {
  const [filas] = await conn.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? LIMIT 1`,
    [tabla, restriccion]
  );
  return filas.length > 0;
}

/**
 * Ejecuta una migración y solo informa los errores reales.
 * @param {number} numero Número de la migración.
 * @param {Function} fn Operación que aplica la migración.
 * @returns {Promise<void>}
 */
async function migrar(numero, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`Migracion ${numero} fallo:`, err.message);
  }
}

/**
 * Crea el esquema, aplica migraciones y cargas iniciales de forma idempotente.
 * Se ejecuta en cada arranque, así que todas las operaciones deben poder repetirse.
 * @returns {Promise<void>}
 */
async function initDatabase() {
  await esperarMySQL();
  const conn = await db;
  console.log('Inicializando base de datos...');

  // Tablas principales. Se crean solo si no existen para no alterar datos previos.

  // Tabla de encargados (usuarios del sistema)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS encargados (
      id_encargado   INT AUTO_INCREMENT PRIMARY KEY,
      codigo         VARCHAR(10) UNIQUE NOT NULL,
      password       VARCHAR(100) NOT NULL,
      nombre         VARCHAR(100) NOT NULL,
      apellido       VARCHAR(100) NOT NULL,
      cargo          VARCHAR(100) DEFAULT 'Encargado de Recursos Tecnológicos',
      estado         BOOLEAN DEFAULT TRUE,
      token_version  INT NOT NULL DEFAULT 0,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de alumnos (personas que solicitan préstamos)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id_alumno      INT AUTO_INCREMENT PRIMARY KEY,
      codigo_alumno  VARCHAR(20) UNIQUE NOT NULL,
      nombre         VARCHAR(100) NOT NULL,
      apellido       VARCHAR(100) NOT NULL,
      carrera        VARCHAR(150),
      curso          VARCHAR(50),
      turno          VARCHAR(20) DEFAULT 'Mañana',
      estado         BOOLEAN DEFAULT TRUE,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de equipos (activos tecnológicos disponibles para préstamo)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS equipos (
      id_equipo      INT AUTO_INCREMENT PRIMARY KEY,
      nombre         VARCHAR(100) NOT NULL,
      tipo           VARCHAR(50)  NOT NULL,
      marca          VARCHAR(50)  NOT NULL,
      estado         ENUM('Disponible','Prestado','En mantenimiento') DEFAULT 'Disponible',
      descripcion    VARCHAR(200),
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de préstamos (registro de salida de equipos)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS prestamos (
      id_prestamo               INT AUTO_INCREMENT PRIMARY KEY,
      id_alumno                 INT NOT NULL,
      id_equipo                 INT NOT NULL,
      id_encargado              INT NOT NULL,
      fecha_prestamo            DATETIME NOT NULL,
      fecha_devolucion_estimada DATETIME NOT NULL,
      estado_inicial_equipo     ENUM('Excelente','Bueno','Dañado') DEFAULT 'Excelente',
      accesorios                VARCHAR(300),
      motivo                    VARCHAR(300),
      observaciones             VARCHAR(300),
      acepto_contrato           BOOLEAN DEFAULT FALSE,
      multa_base                DECIMAL(12,2) DEFAULT NULL,
      estado                    ENUM('ACTIVO','DEVUELTO') DEFAULT 'ACTIVO',
      anulado                   BOOLEAN NOT NULL DEFAULT FALSE,
      motivo_anulacion          VARCHAR(300) DEFAULT NULL,
      fecha_anulacion           DATETIME DEFAULT NULL,
      FOREIGN KEY (id_alumno)    REFERENCES alumnos(id_alumno),
      FOREIGN KEY (id_equipo)    REFERENCES equipos(id_equipo),
      FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado)
    )
  `);

  // Tabla de devoluciones (registro de entrega de equipos)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS devoluciones (
      id_devolucion    INT AUTO_INCREMENT PRIMARY KEY,
      id_prestamo      INT NOT NULL,
      fecha_devolucion DATETIME NOT NULL,
      estado_equipo    ENUM('Excelente','Bueno','Dañado') NOT NULL,
      tiene_dano       BOOLEAN DEFAULT FALSE,
      tipo_dano        VARCHAR(200),
      observacion_dano VARCHAR(300),
      monto_dano       DECIMAL(12,2) DEFAULT 0,
      dias_retraso     INT DEFAULT 0,
      monto_multa      DECIMAL(12,2) DEFAULT 0,
      total_cobro      DECIMAL(12,2) DEFAULT 0,
      observacion      VARCHAR(300),
      anulado          BOOLEAN NOT NULL DEFAULT FALSE,
      motivo_anulacion VARCHAR(300) DEFAULT NULL,
      fecha_anulacion  DATETIME DEFAULT NULL,
      FOREIGN KEY (id_prestamo) REFERENCES prestamos(id_prestamo)
    )
  `);

  // Tabla de configuración (valores del sistema como multa por día)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id_config  INT AUTO_INCREMENT PRIMARY KEY,
      clave      VARCHAR(100) UNIQUE NOT NULL,
      valor      VARCHAR(200) NOT NULL,
      descripcion VARCHAR(300)
    )
  `);

  // Tabla de auditoría (registro de acciones sobre los datos del sistema)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id_auditoria      INT AUTO_INCREMENT PRIMARY KEY,
      id_encargado      INT DEFAULT NULL,
      codigo_encargado  VARCHAR(10) DEFAULT NULL,
      accion            VARCHAR(20) NOT NULL,
      entidad           VARCHAR(30) NOT NULL,
      id_entidad        VARCHAR(40) DEFAULT NULL,
      detalle           VARCHAR(500) DEFAULT NULL,
      ip                VARCHAR(45) DEFAULT NULL,
      fecha             DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auditoria_fecha (fecha),
      INDEX idx_auditoria_entidad (entidad),
      FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado) ON DELETE SET NULL
    )
  `);

  // Migraciones para bases ya creadas. Los tipos "columna", "indice" y
  // "restriccion" verifican su existencia antes de ejecutar el SQL.
  const migraciones = [
    { n: 1, sql: "UPDATE prestamos SET estado_inicial_equipo = 'Dañado' WHERE estado_inicial_equipo = 'Daniado'" },
    { n: 2, sql: "ALTER TABLE prestamos MODIFY COLUMN estado_inicial_equipo ENUM('Excelente','Bueno','Dañado') DEFAULT 'Excelente'" },
    { n: 3, sql: "UPDATE devoluciones SET estado_equipo = 'Dañado' WHERE estado_equipo = 'Daniado'" },
    { n: 4, sql: "ALTER TABLE devoluciones MODIFY COLUMN estado_equipo ENUM('Excelente','Bueno','Dañado') NOT NULL" },
    { n: 5, tipo: 'columna', tabla: 'prestamos', nombre: 'multa_base', sql: "ALTER TABLE prestamos ADD COLUMN multa_base DECIMAL(12,2) DEFAULT NULL AFTER acepto_contrato" },
    { n: 6, sql: "UPDATE prestamos SET multa_base = NULL WHERE multa_base = 0" },
    { n: 7, sql: "ALTER TABLE encargados MODIFY COLUMN codigo VARCHAR(10) NOT NULL" },
    { n: 8, tipo: 'columna', tabla: 'devoluciones', nombre: 'id_encargado', sql: "ALTER TABLE devoluciones ADD COLUMN id_encargado INT DEFAULT NULL AFTER id_prestamo" },
    { n: 9, tipo: 'restriccion', tabla: 'devoluciones', nombre: 'fk_dev_encargado', sql: "ALTER TABLE devoluciones ADD CONSTRAINT fk_dev_encargado FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado)" },
    { n: 10, tipo: 'indice', tabla: 'prestamos', nombre: 'idx_prestamos_estado', sql: "CREATE INDEX idx_prestamos_estado ON prestamos(estado)" },
    { n: 12, tipo: 'restriccion', tabla: 'prestamos', nombre: 'chk_fecha_dev', sql: "ALTER TABLE prestamos ADD CONSTRAINT chk_fecha_dev CHECK (fecha_devolucion_estimada > fecha_prestamo)" },
    { n: 13, tipo: 'columna', tabla: 'encargados', nombre: 'rol', sql: "ALTER TABLE encargados ADD COLUMN rol VARCHAR(20) DEFAULT 'admin' AFTER cargo" },
    { n: 14, tipo: 'columna', tabla: 'prestamos', nombre: 'codigo_prestamo', sql: "ALTER TABLE prestamos ADD COLUMN codigo_prestamo VARCHAR(20) UNIQUE AFTER id_prestamo" },
    { n: 15, sql: "UPDATE prestamos SET codigo_prestamo = CONCAT('PRE-', LPAD(id_prestamo, 3, '0')) WHERE codigo_prestamo IS NULL" },
    { n: 16, tipo: 'columna', tabla: 'alumnos', nombre: 'turno', sql: "ALTER TABLE alumnos ADD COLUMN turno VARCHAR(20) DEFAULT 'Mañana' AFTER curso" },
    { n: 17, sql: "UPDATE alumnos SET carrera='Bachillerato Técnico en Informática', curso='3° año', turno='Mañana' WHERE codigo_alumno='ALU001' AND carrera LIKE 'Ingenier%'" },
    { n: 18, sql: "UPDATE alumnos SET carrera='Bachillerato Técnico en Contabilidad', curso='2° año', turno='Tarde' WHERE codigo_alumno='ALU002' AND carrera LIKE 'Administraci%'" },
    { n: 19, sql: "UPDATE alumnos SET carrera='Bachillerato Científico en Ciencias Sociales', curso='1° año', turno='Mañana' WHERE codigo_alumno='ALU003' AND carrera='Medicina'" },
    { n: 20, tipo: 'columna', tabla: 'encargados', nombre: 'token_version', sql: "ALTER TABLE encargados ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER estado" },
    // Limpia los índices UNIQUE duplicados que versiones anteriores agregaban en cada arranque.
    {
      n: 21,
      ejecutar: async (c) => {
        const [duplicados] = await c.query(`
          SELECT s.INDEX_NAME
          FROM information_schema.STATISTICS s
          WHERE s.TABLE_SCHEMA = DATABASE()
            AND s.TABLE_NAME = 'encargados'
            AND s.COLUMN_NAME = 'codigo'
            AND s.NON_UNIQUE = 0
            AND s.INDEX_NAME LIKE 'codigo\\_%'
            AND (
              SELECT COUNT(*) FROM information_schema.STATISTICS s2
              WHERE s2.TABLE_SCHEMA = s.TABLE_SCHEMA
                AND s2.TABLE_NAME = s.TABLE_NAME
                AND s2.INDEX_NAME = s.INDEX_NAME
            ) = 1
        `);
        for (const fila of duplicados) {
          const nombre = String(fila.INDEX_NAME).replace(/`/g, '``');
          await c.query('ALTER TABLE encargados DROP INDEX `' + nombre + '`');
        }
      }
    },
    // Garantiza que exista exactamente la restricción UNIQUE necesaria sobre codigo.
    {
      n: 22,
      ejecutar: async (c) => {
        const [indices] = await c.query('SHOW INDEX FROM encargados');
        const unicoCodigo = indices.some(function (i) {
          return i.Column_name === 'codigo' && Number(i.Non_unique) === 0;
        });
        if (!unicoCodigo) {
          await c.query('ALTER TABLE encargados ADD UNIQUE INDEX codigo (codigo)');
        }
      }
    },
    { n: 23, tipo: 'columna', tabla: 'prestamos', nombre: 'anulado', sql: 'ALTER TABLE prestamos ADD COLUMN anulado BOOLEAN NOT NULL DEFAULT FALSE AFTER estado' },
    { n: 24, tipo: 'columna', tabla: 'prestamos', nombre: 'motivo_anulacion', sql: 'ALTER TABLE prestamos ADD COLUMN motivo_anulacion VARCHAR(300) DEFAULT NULL AFTER anulado' },
    { n: 25, tipo: 'columna', tabla: 'prestamos', nombre: 'fecha_anulacion', sql: 'ALTER TABLE prestamos ADD COLUMN fecha_anulacion DATETIME DEFAULT NULL AFTER motivo_anulacion' },
    { n: 26, tipo: 'columna', tabla: 'devoluciones', nombre: 'anulado', sql: 'ALTER TABLE devoluciones ADD COLUMN anulado BOOLEAN NOT NULL DEFAULT FALSE AFTER observacion' },
    { n: 27, tipo: 'columna', tabla: 'devoluciones', nombre: 'motivo_anulacion', sql: 'ALTER TABLE devoluciones ADD COLUMN motivo_anulacion VARCHAR(300) DEFAULT NULL AFTER anulado' },
    { n: 28, tipo: 'columna', tabla: 'devoluciones', nombre: 'fecha_anulacion', sql: 'ALTER TABLE devoluciones ADD COLUMN fecha_anulacion DATETIME DEFAULT NULL AFTER motivo_anulacion' },
    { n: 29, tipo: 'indice', tabla: 'prestamos', nombre: 'idx_prestamos_anulado', sql: 'CREATE INDEX idx_prestamos_anulado ON prestamos(anulado)' },
    { n: 30, tipo: 'indice', tabla: 'devoluciones', nombre: 'idx_devoluciones_anulado', sql: 'CREATE INDEX idx_devoluciones_anulado ON devoluciones(anulado)' },
    { n: 31, tipo: 'columna', tabla: 'prestamos', nombre: 'contrato_version', sql: 'ALTER TABLE prestamos ADD COLUMN contrato_version VARCHAR(10) DEFAULT NULL AFTER multa_base' },
    { n: 32, tipo: 'columna', tabla: 'prestamos', nombre: 'fecha_aceptacion', sql: 'ALTER TABLE prestamos ADD COLUMN fecha_aceptacion DATETIME DEFAULT NULL AFTER contrato_version' }
  ];

  for (const m of migraciones) {
    await migrar(m.n, async () => {
      if (m.tipo === 'columna' && await existeColumna(conn, m.tabla, m.nombre)) return;
      if (m.tipo === 'indice' && await existeIndice(conn, m.tabla, m.nombre)) return;
      if (m.tipo === 'restriccion' && await existeRestriccion(conn, m.tabla, m.nombre)) return;
      if (m.ejecutar) return m.ejecutar(conn);
      await conn.query(m.sql);
    });
  }

  // Triggers que mantienen sincronizados los estados de equipos y préstamos.
  // Se recrean en cada arranque para que la definición vigente sea siempre la del código.

  // Evita prestar un equipo que no esté disponible
  await conn.query('DROP TRIGGER IF EXISTS validar_prestamo');
  await conn.query(`
    CREATE TRIGGER validar_prestamo
    BEFORE INSERT ON prestamos
    FOR EACH ROW
    BEGIN
      DECLARE estado_actual VARCHAR(30);
      SELECT estado INTO estado_actual FROM equipos WHERE id_equipo = NEW.id_equipo;
      IF estado_actual != 'Disponible' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El equipo no está disponible para préstamo';
      END IF;
    END
  `);

  // Al crear un préstamo, marca el equipo como "Prestado"
  await conn.query('DROP TRIGGER IF EXISTS actualizar_estado_prestamo');
  await conn.query(`
    CREATE TRIGGER actualizar_estado_prestamo
    AFTER INSERT ON prestamos
    FOR EACH ROW
    BEGIN
      UPDATE equipos SET estado = 'Prestado' WHERE id_equipo = NEW.id_equipo;
    END
  `);

  // Al devolver, actualiza el estado del equipo según si tiene daños o no
  await conn.query('DROP TRIGGER IF EXISTS actualizar_estado_devolucion');
  await conn.query(`
    CREATE TRIGGER actualizar_estado_devolucion
    AFTER INSERT ON devoluciones
    FOR EACH ROW
    BEGIN
      DECLARE equipo_id INT;
      SELECT id_equipo INTO equipo_id FROM prestamos WHERE id_prestamo = NEW.id_prestamo;
      IF NEW.tiene_dano = TRUE THEN
        UPDATE equipos SET estado = 'En mantenimiento' WHERE id_equipo = equipo_id;
      ELSE
        UPDATE equipos SET estado = 'Disponible' WHERE id_equipo = equipo_id;
      END IF;
      UPDATE prestamos SET estado = 'DEVUELTO' WHERE id_prestamo = NEW.id_prestamo;
    END
  `);

  // Usuarios iniciales. En desarrollo se sincronizan cuentas de ejemplo; en producción
  // no se crean credenciales conocidas y se exige un administrador por variables de entorno.

  const esProduccion = process.env.NODE_ENV === 'production';
  if (esProduccion) {
    const [admins] = await conn.query(
      "SELECT COUNT(*) AS c FROM encargados WHERE rol = 'admin' AND estado = 1"
    );
    // Sin administradores activos se crea uno, validando antes el formato de las credenciales.
    if (Number(admins[0].c) === 0) {
      const codigo = String(process.env.ADMIN_INICIAL_CODIGO || '').trim();
      const password = String(process.env.ADMIN_INICIAL_PASSWORD || '');
      const nombre = String(process.env.ADMIN_INICIAL_NOMBRE || 'Administrador').trim();
      const apellido = String(process.env.ADMIN_INICIAL_APELLIDO || 'Sistema').trim();
      if (!codigo || !password) {
        throw new Error('No hay administrador activo. Definí ADMIN_INICIAL_CODIGO y ADMIN_INICIAL_PASSWORD antes de iniciar en producción.');
      }
      if (!/^[A-Za-z0-9_-]{1,10}$/.test(codigo)) {
        throw new Error('ADMIN_INICIAL_CODIGO debe tener hasta 10 caracteres alfanuméricos, guion o guion bajo.');
      }
      if (password.length < 12) {
        throw new Error('ADMIN_INICIAL_PASSWORD debe tener al menos 12 caracteres.');
      }
      const hash = await bcrypt.hash(password, 10);
      await conn.query(
        `INSERT INTO encargados (codigo, password, nombre, apellido, cargo, rol)
         VALUES (?, ?, ?, ?, ?, 'admin')`,
        [codigo, hash, nombre, apellido, 'Administrador del Sistema']
      );
      console.log('Administrador inicial creado desde variables de entorno.');
    }
  } else {
    const hash = await bcrypt.hash('Adm1n2026', 10);
    const viewerHash = await bcrypt.hash('V1su4l#2026', 10);
    const usuarios = [
      ['1001', hash, 'Angelo',  'Caballero',    'Encargado de Recursos Tecnológicos', 'admin'],
      ['1002', hash, 'Elian',   'Valtierra',    'Encargado de Recursos Tecnológicos', 'lectura'],
      ['1003', hash, 'Naira',   'Soldevila',    'Encargado de Recursos Tecnológicos', 'lectura'],
      ['1004', hash, 'Gael',    'Monteserín',   'Encargado de Recursos Tecnológicos', 'lectura'],
      ['1005', hash, 'Aitana',  'Berenguer',    'Encargado de Recursos Tecnológicos', 'lectura'],
      ['0000', viewerHash, 'Invitado', '', 'Visualizador', 'lectura'],
    ];
    for (const u of usuarios) {
      await conn.query(
        `INSERT INTO encargados (codigo, password, nombre, apellido, cargo, rol)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), apellido = VALUES(apellido), cargo = VALUES(cargo), rol = VALUES(rol)`,
        u
      );
    }
    console.log('Encargados sincronizados');
  }

  // Configuración base. INSERT IGNORE conserva los valores que el administrador haya cambiado.

  await conn.query(
    "INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)",
    ['multa_por_dia', '10000', 'Monto en guaraníes por día de retraso']
  );

  // Datos de ejemplo solo en desarrollo y únicamente si la tabla está vacía.

  if (!esProduccion) {
    const [aluCount] = await conn.query('SELECT COUNT(*) AS c FROM alumnos');
    if (aluCount[0].c === 0) {
      await conn.query("INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso,turno) VALUES ('ALU001','María','González','Bachillerato Técnico en Informática','3° año','Mañana')");
      await conn.query("INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso,turno) VALUES ('ALU002','Carlos','Mendoza','Bachillerato Técnico en Contabilidad','2° año','Tarde')");
      await conn.query("INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso,turno) VALUES ('ALU003','Ana','Rivas','Bachillerato Científico en Ciencias Sociales','1° año','Mañana')");
      console.log('Alumnos de ejemplo creados (ALU001-ALU003)');
    }

    const [eqCount] = await conn.query('SELECT COUNT(*) AS c FROM equipos');
    if (eqCount[0].c === 0) {
      await conn.query("INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES ('ThinkPad X1 Carbon','Laptop','Lenovo','16GB RAM, SSD 512GB')");
      await conn.query("INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES ('MacBook Pro 14','Laptop','Apple','M3 Pro, 18GB RAM')");
      await conn.query("INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES ('OptiPlex 7090','PC','Dell','Intel i7, 32GB RAM, SSD 1TB')");
      await conn.query("INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES ('Surface Laptop 5','Laptop','Microsoft','i5, 8GB RAM, 256GB SSD')");
      await conn.query("INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES ('Predator Helios 300','Laptop','Acer','i7, 16GB RAM, RTX 3060')");
      console.log('Equipos de ejemplo creados (5 equipos)');
    }
  }

  console.log('Base de datos inicializada correctamente');
}

module.exports = initDatabase;
