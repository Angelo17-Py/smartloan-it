const db = require('./db');
const bcrypt = require('bcryptjs');

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

async function initDatabase() {
  await esperarMySQL();
  const conn = await db;
  console.log('Inicializando base de datos...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS encargados (
      id_encargado   INT AUTO_INCREMENT PRIMARY KEY,
      codigo         VARCHAR(10) UNIQUE NOT NULL,
      password       VARCHAR(100) NOT NULL,
      nombre         VARCHAR(100) NOT NULL,
      apellido       VARCHAR(100) NOT NULL,
      cargo          VARCHAR(100) DEFAULT 'Encargado de Recursos Tecnológicos',
      estado         BOOLEAN DEFAULT TRUE,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id_alumno      INT AUTO_INCREMENT PRIMARY KEY,
      codigo_alumno  VARCHAR(20) UNIQUE NOT NULL,
      nombre         VARCHAR(100) NOT NULL,
      apellido       VARCHAR(100) NOT NULL,
      carrera        VARCHAR(150),
      curso          VARCHAR(50),
      cedula         VARCHAR(20),
      estado         BOOLEAN DEFAULT TRUE,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
      FOREIGN KEY (id_alumno)    REFERENCES alumnos(id_alumno),
      FOREIGN KEY (id_equipo)    REFERENCES equipos(id_equipo),
      FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado)
    )
  `);

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
      FOREIGN KEY (id_prestamo) REFERENCES prestamos(id_prestamo)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id_config  INT AUTO_INCREMENT PRIMARY KEY,
      clave      VARCHAR(100) UNIQUE NOT NULL,
      valor      VARCHAR(200) NOT NULL,
      descripcion VARCHAR(300)
    )
  `);

  // Migraciones para bases de datos existentes
  try { await conn.query("UPDATE prestamos SET estado_inicial_equipo = 'Dañado' WHERE estado_inicial_equipo = 'Daniado'"); } catch (e) {}
  try { await conn.query("ALTER TABLE prestamos MODIFY COLUMN estado_inicial_equipo ENUM('Excelente','Bueno','Dañado') DEFAULT 'Excelente'"); } catch (e) {}
  try { await conn.query("UPDATE devoluciones SET estado_equipo = 'Dañado' WHERE estado_equipo = 'Daniado'"); } catch (e) {}
  try { await conn.query("ALTER TABLE devoluciones MODIFY COLUMN estado_equipo ENUM('Excelente','Bueno','Dañado') NOT NULL"); } catch (e) {}
  try { await conn.query("ALTER TABLE prestamos ADD COLUMN multa_base DECIMAL(12,2) DEFAULT NULL AFTER acepto_contrato"); } catch (e) {}
  try { await conn.query("UPDATE prestamos SET multa_base = NULL WHERE multa_base = 0"); } catch (e) {}
  try { await conn.query("ALTER TABLE encargados MODIFY COLUMN codigo VARCHAR(10) UNIQUE NOT NULL"); } catch (e) {}

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
        SET MESSAGE_TEXT = 'El equipo no esta disponible para prestamo';
      END IF;
    END
  `);

  await conn.query('DROP TRIGGER IF EXISTS actualizar_estado_prestamo');
  await conn.query(`
    CREATE TRIGGER actualizar_estado_prestamo
    AFTER INSERT ON prestamos
    FOR EACH ROW
    BEGIN
      UPDATE equipos SET estado = 'Prestado' WHERE id_equipo = NEW.id_equipo;
    END
  `);

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

  await conn.query("DELETE FROM encargados WHERE codigo = '1234'");
  const hash = await bcrypt.hash('CREDENCIALES_BORRADAS', 10);
  const usuarios = [
    ['1010', hash, 'Angelo',  'Caballero',    'Encargado de Recursos Tecnológicos'],
    ['1020', hash, 'Elian',   'Valtierra',    'Encargado de Recursos Tecnológicos'],
    ['1030', hash, 'Naira',   'Soldevila',    'Encargado de Recursos Tecnológicos'],
    ['1040', hash, 'Gael',    'Monteserín',   'Encargado de Recursos Tecnológicos'],
    ['1050', hash, 'Aitana',  'Berenguer',    'Encargado de Recursos Tecnológicos'],
  ];
  for (const u of usuarios) {
    await conn.query(
      'INSERT IGNORE INTO encargados (codigo, password, nombre, apellido, cargo) VALUES (?, ?, ?, ?, ?)',
      u
    );
  }
  console.log('Encargados sincronizados (1010-1050 / CREDENCIALES_BORRADAS)');

  await conn.query(
    "INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?, ?, ?)",
    ['multa_por_dia', '10000', 'Monto en guaranies por dia de retraso']
  );

  console.log('Base de datos inicializada correctamente');
}

module.exports = initDatabase;