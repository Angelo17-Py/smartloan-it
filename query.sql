-- Sistema de Gestion de Préstamos de Equipos Tecnológicos
-- SmartLoan IT - UNIDA

CREATE DATABASE IF NOT EXISTS prestamos_db;
USE prestamos_db;

CREATE TABLE encargados (
    id_encargado   INT AUTO_INCREMENT PRIMARY KEY,
    codigo         VARCHAR(10) UNIQUE NOT NULL,
    password       VARCHAR(100) NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100) NOT NULL,
    cargo          VARCHAR(100) DEFAULT 'Encargado de Recursos Tecnológicos',
    estado         BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alumnos (
    id_alumno      INT AUTO_INCREMENT PRIMARY KEY,
    codigo_alumno  VARCHAR(20) UNIQUE NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100) NOT NULL,
    carrera        VARCHAR(150),
    curso          VARCHAR(50),
    cedula         VARCHAR(20) UNIQUE,
    estado         BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipos (
    id_equipo      INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    tipo           VARCHAR(50)  NOT NULL,
    marca          VARCHAR(50)  NOT NULL,
    estado         ENUM('Disponible','Prestado','En mantenimiento') DEFAULT 'Disponible',
    descripcion    VARCHAR(200),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prestamos (
    id_prestamo               INT AUTO_INCREMENT PRIMARY KEY,
    id_alumno                 INT NOT NULL,
    id_equipo                 INT NOT NULL,
    id_encargado              INT NOT NULL,
    fecha_prestamo            DATETIME NOT NULL,
    fecha_devolucion_estimada DATETIME NOT NULL,
    estado_inicial_equipo     ENUM('Excelente','Bueno','Dañado') DEFAULT 'Excelente',
    multa_base                DECIMAL(12,2) DEFAULT NULL,
    accesorios                VARCHAR(300),
    motivo                    VARCHAR(300),
    observaciones             VARCHAR(300),
    acepto_contrato           BOOLEAN DEFAULT FALSE,
    estado                    ENUM('ACTIVO','DEVUELTO') DEFAULT 'ACTIVO',
    FOREIGN KEY (id_alumno)    REFERENCES alumnos(id_alumno),
    FOREIGN KEY (id_equipo)    REFERENCES equipos(id_equipo),
    FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado),
    CONSTRAINT chk_fecha_dev CHECK (fecha_devolucion_estimada > fecha_prestamo)
);

CREATE INDEX idx_prestamos_estado ON prestamos(estado);

CREATE TABLE devoluciones (
    id_devolucion    INT AUTO_INCREMENT PRIMARY KEY,
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
    FOREIGN KEY (id_prestamo) REFERENCES prestamos(id_prestamo),
    FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado)
);

-- Tabla de configuracion del sistema
CREATE TABLE IF NOT EXISTS configuracion (
    id_config  INT AUTO_INCREMENT PRIMARY KEY,
    clave      VARCHAR(100) UNIQUE NOT NULL,
    valor      VARCHAR(200) NOT NULL,
    descripcion VARCHAR(300)
);

DELIMITER $$

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

CREATE TRIGGER actualizar_estado_prestamo
AFTER INSERT ON prestamos
FOR EACH ROW
BEGIN
    UPDATE equipos SET estado = 'Prestado' WHERE id_equipo = NEW.id_equipo;
END$$

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

-- Encargados y contraseña
INSERT INTO encargados (codigo, password, nombre, apellido, cargo) VALUES
('1010', 'REEMPLAZAR_CONTRASENA', 'Angelo', 'Caballero', 'Encargado de Recursos Tecnológicos'),
('1020', 'REEMPLAZAR_CONTRASENA', 'Elian', 'Valtierra', 'Encargado de Recursos Tecnológicos'),
('1030', 'REEMPLAZAR_CONTRASENA', 'Naira', 'Soldevila', 'Encargado de Recursos Tecnológicos'),
('1040', 'REEMPLAZAR_CONTRASENA', 'Gael', 'Monteserín', 'Encargado de Recursos Tecnológicos'),
('1050', 'REEMPLAZAR_CONTRASENA', 'Aitana', 'Berenguer', 'Encargado de Recursos Tecnológicos');

-- Multa por dia de retraso en guaranies
INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
('multa_por_dia', '10000', 'Monto en guaranies que se cobra por cada dia de retraso en la devolucion');

-- Datos de ejemplo
INSERT INTO alumnos (codigo_alumno, nombre, apellido, carrera, curso) VALUES
('ALU001', 'Maria',   'Gonzalez', 'Ingenieria en Informatica',  '3er año'),
('ALU002', 'Carlos',  'Mendoza',  'Administracion de Empresas', '2do año'),
('ALU003', 'Ana',     'Rivas',    'Medicina',                   '4to año');

INSERT INTO equipos (nombre, tipo, marca, descripcion) VALUES
('ThinkPad X1 Carbon',   'Laptop', 'Lenovo',    '16GB RAM, SSD 512GB'),
('MacBook Pro 14',       'Laptop', 'Apple',     'M3 Pro, 18GB RAM'),
('OptiPlex 7090',        'PC',     'Dell',      'Intel i7, 32GB RAM, SSD 1TB'),
('Surface Laptop 5',     'Laptop', 'Microsoft', 'i5, 8GB RAM, 256GB SSD'),
('Predator Helios 300',  'Laptop', 'Acer',      'i7, 16GB RAM, RTX 3060');
