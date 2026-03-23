-- USUARIOS
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    cedula VARCHAR(20),
    rol ENUM('ADMIN', 'GESTOR'),
    estado BOOLEAN DEFAULT TRUE
);

-- EQUIPOS
CREATE TABLE equipos (
    id_equipo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    tipo VARCHAR(50),
    marca VARCHAR(50),
    estado ENUM('Disponible', 'Prestado', 'Mantenimiento') DEFAULT 'Disponible',
    descripcion VARCHAR(200)
);

-- PRESTAMOS
CREATE TABLE prestamos (
    id_prestamo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_equipo INT,
    fecha_prestamo DATETIME,
    fecha_devolucion_estimada DATETIME,
    estado ENUM('ACTIVO', 'DEVUELTO') DEFAULT 'ACTIVO',

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_equipo) REFERENCES equipos(id_equipo)
);

-- DEVOLUCIONES
CREATE TABLE devoluciones (
    id_devolucion INT AUTO_INCREMENT PRIMARY KEY,
    id_prestamo INT,
    fecha_devolucion DATETIME,
    estado_equipo VARCHAR(100),
    observacion VARCHAR(200),

    FOREIGN KEY (id_prestamo) REFERENCES prestamos(id_prestamo)
);

-- Evita prestar equipo ya prestado 
DELIMITER $$

CREATE TRIGGER validar_prestamo
BEFORE INSERT ON prestamos
FOR EACH ROW
BEGIN
    DECLARE estado_actual VARCHAR(20);

    SELECT estado INTO estado_actual
    FROM equipos
    WHERE id_equipo = NEW.id_equipo;

    IF estado_actual = 'Prestado' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El equipo ya está prestado';
    END IF;
END$$

DELIMITER ;

-- Cambia de estado al prestar 
DELIMITER $$

CREATE TRIGGER actualizar_estado_prestamo
AFTER INSERT ON prestamos
FOR EACH ROW
BEGIN
    UPDATE equipos
    SET estado = 'Prestado'
    WHERE id_equipo = NEW.id_equipo;
END$$

DELIMITER ;

-- Cambia de estado al devolver
DELIMITER $$

CREATE TRIGGER actualizar_estado_devolucion
AFTER INSERT ON devoluciones
FOR EACH ROW
BEGIN
    UPDATE equipos
    SET estado = 'Disponible'
    WHERE id_equipo = (
        SELECT id_equipo FROM prestamos
        WHERE id_prestamo = NEW.id_prestamo
    );

    UPDATE prestamos
    SET estado = 'DEVUELTO'
    WHERE id_prestamo = NEW.id_prestamo;
END$$

DELIMITER ;