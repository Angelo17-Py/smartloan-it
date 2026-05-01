# 📦 SmartLoan IT
### Sistema de Gestión de Préstamos de Recursos Tecnológicos
> Proyecto Académico — Ingeniería en Informática · Universidad Integración de las Américas

![Node.js](https://img.shields.io/badge/Node.js-22.x-green?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-5.x-black?style=flat-square&logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square&logo=mysql)
![Docker](https://img.shields.io/badge/Docker-ready-blue?style=flat-square&logo=docker)

---

## 📋 Descripción

**SmartLoan IT** es un sistema web para la gestión de préstamos de activos tecnológicos en instituciones educativas. Permite al encargado registrar equipos, alumnos, préstamos y devoluciones, con control automático de multas por retraso y registro de daños.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Login** | Acceso seguro por código numérico y contraseña |
| 📊 **Dashboard** | Métricas en tiempo real: equipos totales, prestados, disponibles y en mantenimiento |
| 🖥️ **Equipos** | Registro, control de estado e historial completo de movimientos |
| 🎓 **Alumnos** | Registro con código automático (ALU001, ALU002...) e historial por alumno |
| 📋 **Préstamos** | Registro completo con contrato de uso, accesorios y motivo |
| 📥 **Devoluciones** | Búsqueda por préstamo activo, registro de daños y **multa automática de Gs. 10.000/día** |
| 📊 **Historial** | Trazabilidad completa de préstamos y devoluciones con filtros |

---

## 🛠️ Tecnologías

**Backend**
- Node.js + Express 5
- MySQL 8.0 (vía Docker)
- mysql2

**Frontend**
- HTML5 + CSS3 + JavaScript vanilla
- Google Fonts (Plus Jakarta Sans)

---

## 📁 Estructura del Proyecto

```
SistemaPrestamos/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── controladores/
│   │   ├── encargadosControlador.js
│   │   ├── alumnosControlador.js
│   │   ├── equiposControlador.js
│   │   ├── prestamosControlador.js
│   │   └── devolucionesControlador.js
│   └── rutas/
│       ├── encargados.js
│       ├── alumnos.js
│       ├── equipos.js
│       ├── prestamos.js
│       └── devoluciones.js
├── frontend/
│   ├── login/login.html
│   ├── home/dashboard.html
│   ├── equipos/equipos.html
│   ├── alumnos/alumnos.html
│   ├── prestamos/prestamos.html
│   ├── devoluciones/devoluciones.html
│   └── historial/historial.html
├── query.sql
└── package.json
```

---

## 🚀 Instalación y Uso

### 1. Requisitos previos
- [Node.js](https://nodejs.org/) v18 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 2. Levantar la base de datos con Docker

```bash
docker run --name SistemaPrestamos -e MYSQL_ROOT_PASSWORD=1234 -p 3307:3306 -d mysql:8.0
```

### 3. Cargar la base de datos

```bash
docker exec -i SistemaPrestamos mysql -u root -p1234 prestamos_db < query.sql
```

### 4. Instalar dependencias

```bash
cd backend
npm install
```

### 5. Iniciar el servidor

```bash
node server.js
```

### 6. Acceder al sistema

Abrí tu navegador en: **http://localhost:3000**

---

## 🔐 Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Código | `1234` |
| Contraseña | `CREDENCIALES_BORRADAS` |

> ⚠️ Se recomienda cambiar las credenciales antes de usar en producción.

---

## 🗄️ Base de Datos

El sistema utiliza **5 tablas principales**:

```
encargados   → Usuarios del sistema (solo se crean desde la BD)
alumnos      → Alumnos que solicitan equipos
equipos      → Activos tecnológicos (Laptops, PCs)
prestamos    → Registro de salida de equipos
devoluciones → Registro de retorno con multas y daños
```

**Triggers automáticos:**
- Al registrar préstamo → equipo pasa a `Prestado`
- Al registrar devolución → equipo pasa a `Disponible` o `En mantenimiento` (si hay daño)
- Validación de disponibilidad antes de prestar

---

## 💰 Lógica de Multas

| Concepto | Valor |
|----------|-------|
| Multa por retraso | **Gs. 10.000 por día** |
| Cálculo | Automático al registrar devolución |
| Registro de daños | Tipo de daño + monto de reparación |

---

## 📸 Capturas

> _Dashboard, Gestión de Equipos, Registro de Préstamos, Devolución con multa automática_

---

## 👨‍💻 Autor

**Angelo Caballero**
Proyecto de Grado — Ingeniería en Informática
Universidad Integración de las Américas · 2026

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos.
