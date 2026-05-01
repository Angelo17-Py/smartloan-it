-- ============================================================
-- SISTEMA DE GESTIÓN DE PRÉSTAMOS DE RECURSOS TECNOLÓGICOS
-- SmartLoan IT v4.0 - Universidad Integración de las Américas
-- ============================================================

CREATE DATABASE IF NOT EXISTS prestamos_db;
USE prestamos_db;

CREATE TABLE encargados (
    id_encargado   INT AUTO_INCREMENT PRIMARY KEY,
    codigo         VARCHAR(4) UNIQUE NOT NULL,
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
    cedula         VARCHAR(20),
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
    accesorios                VARCHAR(300),
    motivo                    VARCHAR(300),
    observaciones             VARCHAR(300),
    acepto_contrato           BOOLEAN DEFAULT FALSE,
    estado                    ENUM('ACTIVO','DEVUELTO') DEFAULT 'ACTIVO',
    FOREIGN KEY (id_alumno)    REFERENCES alumnos(id_alumno),
    FOREIGN KEY (id_equipo)    REFERENCES equipos(id_equipo),
    FOREIGN KEY (id_encargado) REFERENCES encargados(id_encargado)
);

CREATE TABLE devoluciones (
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

-- Encargado: código 1234, contraseña CREDENCIALES_BORRADAS
INSERT INTO encargados (codigo, password, nombre, apellido, cargo) VALUES
('1234', 'CREDENCIALES_BORRADAS', 'Angelo', 'Caballero', 'Encargado de Recursos Tecnológicos');
