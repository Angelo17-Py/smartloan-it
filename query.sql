-- Sistema de Gestión de Préstamos de Equipos Tecnológicos
-- SmartLoanIT - Colegios de Paraguay
-- ATENCION: Este schema se genera automaticamente via initDb.js al iniciar la app.
-- Este archivo es solo para referencia o para inicializar la BD manualmente.
-- Los passwords deben generarse con bcrypt (ver initDb.js para los valores actualizados).

CREATE DATABASE IF NOT EXISTS prestamos_db;
USE prestamos_db;

-- Encargados: personal que opera el sistema. codigo es el identificador de login,
-- password guarda el hash bcrypt y token_version permite revocar sesiones activas.
CREATE TABLE encargados (
    id_encargado   INT AUTO_INCREMENT PRIMARY KEY,
    codigo         VARCHAR(10) UNIQUE NOT NULL,
    password       VARCHAR(100) NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100) NOT NULL,
    cargo          VARCHAR(100) DEFAULT 'Encargado de Equipos Institucionales',
    rol            VARCHAR(20) DEFAULT 'admin',
    estado         BOOLEAN DEFAULT TRUE,
    token_version  INT NOT NULL DEFAULT 0,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alumnos: solicitantes de préstamos. codigo_alumno es único para evitar duplicados.
CREATE TABLE alumnos (
    id_alumno      INT AUTO_INCREMENT PRIMARY KEY,
    codigo_alumno  VARCHAR(20) UNIQUE NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100) NOT NULL,
    carrera        VARCHAR(150),
    curso          VARCHAR(50),
    turno          VARCHAR(20) DEFAULT 'Mañana',
    estado         BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Equipos: inventario prestable. El estado lo alternan los triggers según préstamos
-- y devoluciones, por eso se controla desde la base y no solo desde la app.
CREATE TABLE equipos (
    id_equipo      INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    tipo           VARCHAR(50)  NOT NULL,
    marca          VARCHAR(50)  NOT NULL,
    estado         ENUM('Disponible','Prestado','En mantenimiento') DEFAULT 'Disponible',
    descripcion    VARCHAR(200),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Préstamos: núcleo del sistema. Cada fila vincula un alumno, un equipo y el encargado
-- que autoriza. Se conserva el estado inicial del equipo y las condiciones pactadas.
CREATE TABLE prestamos (
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
    -- Relaciones: el préstamo no puede existir sin alumno, equipo ni encargado válidos.
    FOREIGN KEY (id_alumno)    REFERENCES alumnos(id_alumno),
    FOREIGN KEY (id_equipo)    REFERENCES equipos(id_equipo),
    FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado),
    -- La devolución debe ser posterior a la entrega; se valida en la propia BD.
    CONSTRAINT chk_fecha_dev CHECK (fecha_devolucion_estimada > fecha_prestamo)
);

-- Acelera los filtros por estado (activos/devueltos) usados en listados y alertas.
CREATE INDEX idx_prestamos_estado ON prestamos(estado);
-- Los registros anulados se excluyen por defecto de listados y reportes.
CREATE INDEX idx_prestamos_anulado ON prestamos(anulado);

-- Devoluciones: cierre de un préstamo. Registra el estado del equipo, daños,
-- retraso y los montos calculados (daño, multa y total a cobrar).
CREATE TABLE devoluciones (
    id_devolucion    INT AUTO_INCREMENT PRIMARY KEY,
    codigo_devolucion VARCHAR(20) UNIQUE,
    id_prestamo      INT NOT NULL,
    id_encargado     INT DEFAULT NULL,
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
    -- Cada devolución pertenece a un préstamo y registra quién la recibió.
    FOREIGN KEY (id_prestamo) REFERENCES prestamos(id_prestamo),
    FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado)
);

-- Los registros anulados se excluyen por defecto de listados y reportes.
CREATE INDEX idx_devoluciones_anulado ON devoluciones(anulado);

-- Configuración: parámetros editables sin recompilar, como la multa diaria.
CREATE TABLE configuracion (
    id_config  INT AUTO_INCREMENT PRIMARY KEY,
    clave      VARCHAR(100) UNIQUE NOT NULL,
    valor      VARCHAR(200) NOT NULL,
    descripcion VARCHAR(300)
);

-- Auditoría: rastro de acciones del sistema. Guarda el código del encargado aunque
-- el usuario se elimine después, por eso la FK usa ON DELETE SET NULL.
CREATE TABLE auditoria (
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
);

-- Valor inicial de la multa por día de retraso; INSERT IGNORE evita duplicarlo al reiniciar.
INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
('multa_por_dia', '10000', 'Monto en guaraníes por día de retraso');

-- Triggers: mantienen la consistencia del inventario aunque se inserte por fuera de la app.
DELIMITER $$

-- Bloquea el préstamo si el equipo no está disponible en el momento de insertar.
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
END$$

-- Marca el equipo como "Prestado" en cuanto se registra el préstamo.
CREATE TRIGGER actualizar_estado_prestamo
AFTER INSERT ON prestamos
FOR EACH ROW
BEGIN
    UPDATE equipos SET estado = 'Prestado' WHERE id_equipo = NEW.id_equipo;
END$$

-- Al devolver: si hubo daño el equipo pasa a mantenimiento; si no, vuelve a disponible.
-- Además cierra el préstamo marcándolo como DEVUELTO.
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
END$$

DELIMITER ;

-- NOTA: Los passwords deben generarse con bcrypt (ver initDb.js).
-- Usuarios del sistema (admin: Adm1n2026, invitado: V1su4l#2026):
-- ('1001', '<bcrypt_hash>', 'Angelo',  'Caballero', 'Encargado de Equipos Institucionales', 'admin'),
-- ('1002', '<bcrypt_hash>', 'Elian',   'Valtierra', 'Encargado de Equipos Institucionales', 'admin'),
-- ('1003', '<bcrypt_hash>', 'Naira',   'Soldevila', 'Encargado de Equipos Institucionales', 'admin'),
-- ('1004', '<bcrypt_hash>', 'Gael',    'Monteserín','Encargado de Equipos Institucionales', 'admin'),
-- ('1005', '<bcrypt_hash>', 'Aitana',  'Berenguer', 'Encargado de Equipos Institucionales', 'admin'),
-- ('0000', '<bcrypt_hash>', 'Invitado','',           'Visualizador',                     'lectura')

-- Datos de ejemplo: alumnos de prueba para probar búsquedas y préstamos.
-- INSERT IGNORE permite reejecutar el script sin duplicar registros.
INSERT IGNORE INTO alumnos (codigo_alumno, nombre, apellido, carrera, curso, turno) VALUES
('ALU001', 'María',   'González', 'Bachillerato Técnico en Informática',           '3° año', 'Mañana'),
('ALU002', 'Carlos',  'Mendoza',  'Bachillerato Técnico en Contabilidad',          '2° año', 'Tarde'),
('ALU003', 'Ana',     'Rivas',    'Bachillerato Científico en Ciencias Sociales',  '1° año', 'Mañana');

-- Equipos de ejemplo con distintos tipos y marcas para el inventario inicial.
INSERT IGNORE INTO equipos (nombre, tipo, marca, descripcion) VALUES
('ThinkPad X1 Carbon',   'Laptop', 'Lenovo',    '16GB RAM, SSD 512GB'),
('MacBook Pro 14',       'Laptop', 'Apple',     'M3 Pro, 18GB RAM'),
('OptiPlex 7090',        'PC',     'Dell',      'Intel i7, 32GB RAM, SSD 1TB'),
('Surface Laptop 5',     'Laptop', 'Microsoft', 'i5, 8GB RAM, 256GB SSD'),
('Predator Helios 300',  'Laptop', 'Acer',      'i7, 16GB RAM, RTX 3060');
