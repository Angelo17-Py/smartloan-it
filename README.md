# SmartLoan IT
### Sistema de Gestión de Préstamos de Recursos Tecnológicos

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-auth-e34f26?style=flat-square&logo=json-web-tokens&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-vanilla-E34F26?style=flat-square&logo=html5&logoColor=white)

> Proyecto de Grado de la Materia Proyecto y Construccion de Sistemas — Ingeniería en Informática  
> Universidad Integración de las Américas · 2026  
> Autor: **Angelo Caballero**

---

## Descripción

SmartLoan IT es un sistema web para la gestión de préstamos de equipos tecnológicos en instituciones educativas. Permite registrar, controlar y hacer seguimiento del uso de laptops y PCs, con control automático de estados, multas por retraso, registro de daños y trazabilidad completa de todos los movimientos.

---

## Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Login** | Acceso por código numérico y contraseña con protección de sesión en todas las páginas |
| **Dashboard** | Métricas en tiempo real, reloj, acciones rápidas, exportación y configuración |
| **Equipos** | Registro, edición, eliminación y control de estado con historial completo |
| **Alumnos** | Registro con código automático (ALU001...), edición y eliminación con validaciones |
| **Préstamos** | Registro con contrato de uso, comprobante imprimible y aviso de disponibilidad |
| **Devoluciones** | Búsqueda por nombre de alumno, registro de daños y cálculo automático de multas |
| **Historial** | Trazabilidad completa con búsqueda en tiempo real y filtros por estado |
| **Exportación** | Descarga de todos los registros en CSV listo para Excel |
| **Configuración** | Multa por día de retraso configurable desde el dashboard sin tocar código |

---

## Tecnologías

**Backend**
- Node.js + Express 5
- MySQL 8.0 (Docker)
- mysql2 (promises)
- Autenticación JWT + bcrypt
- Variables de entorno (dotenv)

**Frontend**
- HTML5 + CSS3 + JavaScript vanilla
- Google Fonts (Plus Jakarta Sans)
- Sin frameworks ni dependencias externas

---

## Estructura del Proyecto

```
SistemaPrestamos/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── initDb.js             ← Auto-creación de tablas al iniciar
│   ├── middleware/
│   │   ├── auth.js          (JWT)
│   │   └── errorHandler.js
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
│   ├── js/
│   │   └── api.js
│   ├── login/login.html
│   ├── home/dashboard.html
│   ├── equipos/equipos.html
│   ├── alumnos/alumnos.html
│   ├── prestamos/prestamos.html
│   ├── devoluciones/devoluciones.html
│   └── historial/historial.html
├── query.sql
├── railway.json              ← Configuración para Railway
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Deploy en Railway (gratuito)

El sistema está preparado para desplegarse en [Railway](https://railway.app/) con un solo clic:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Angelo17-Py/smartloan-it)

### Pasos manuales

1. Crea una cuenta en [railway.app](https://railway.app/) con tu GitHub
2. Haz clic en **New Project** → **Deploy from GitHub repo**
3. Selecciona `Angelo17-Py/smartloan-it`
4. Agrega un plugin **MySQL** desde el dashboard
5. Agrega las variables de entorno:
   - `JWT_SECRET` → cualquier clave secreta (ej: `SmartLoanIT_Produccion_2026`)
6. Railway iniciará el deploy automáticamente
7. Abrí la URL que Railway te asigne (ej: `smartloan-it.up.railway.app`)
8. Inicia sesión con: código `1234` / contraseña `CREDENCIALES_BORRADAS`

> **Nota**: La base de datos y tablas se crean automáticamente en el primer inicio.

---

## Instalación y Uso

### Requisitos previos
- [Node.js](https://nodejs.org/) v18 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Opción 1: Usando Docker Compose (recomendado)

```bash
# Iniciar MySQL + App
docker compose up -d

# La app crea automaticamente las tablas al iniciar
# Solo necesitas cargar los datos iniciales
docker exec -i smartloan-app node backend/initDb.js
```

### Opción 2: Manual

```bash
# 1. Crear el contenedor de MySQL
docker run --name smartloan-mysql -e MYSQL_ROOT_PASSWORD=1234 -p 3307:3306 -d mysql:8.0

# 2. Configurar variables de entorno
copy .env.example .env

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor (crea tablas automaticamente)
npm start
```

### 7. Acceder al sistema

Abrí tu navegador en: **http://localhost:3000**

---

## Credenciales por defecto

| Campo | Valor |
|-------|-------|
| Código | `1234` |
| Contraseña | `CREDENCIALES_BORRADAS` |

---

## Base de Datos

El sistema utiliza **6 tablas**:

```
encargados      → Usuarios del sistema
alumnos         → Alumnos que solicitan equipos
equipos         → Activos tecnológicos (Laptops, PCs)
prestamos       → Registro de salida de equipos
devoluciones    → Registro de retorno con daños y multas
configuracion   → Parámetros del sistema (multa por día, etc.)
```

**Triggers automáticos en MySQL:**

| Trigger | Acción |
|---------|--------|
| `validar_prestamo` | Impide prestar un equipo que no esté disponible |
| `actualizar_estado_prestamo` | Al registrar préstamo → equipo pasa a `Prestado` |
| `actualizar_estado_devolucion` | Al registrar devolución → equipo pasa a `Disponible` o `En mantenimiento` según si hay daños |

---

## API Endpoints

> Todos los endpoints (excepto `/encargados/login`) requieren autenticación JWT.
> Enviar header: `Authorization: Bearer <token>`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/encargados/login` | Autenticación (retorna `{ token, usuario }`) |
| GET | `/alumnos` | Listar alumnos activos |
| GET | `/alumnos/disponibles` | Alumnos sin préstamo activo |
| POST | `/alumnos` | Registrar alumno |
| PUT | `/alumnos/:id` | Editar alumno |
| DELETE | `/alumnos/:id` | Eliminar alumno |
| GET | `/equipos` | Listar equipos |
| POST | `/equipos` | Registrar equipo |
| PUT | `/equipos/:id` | Editar equipo |
| PATCH | `/equipos/:id/estado` | Cambiar estado del equipo |
| DELETE | `/equipos/:id` | Eliminar equipo |
| GET | `/prestamos` | Listar préstamos |
| POST | `/prestamos` | Registrar préstamo |
| GET | `/prestamos/:id` | Buscar préstamo activo por ID |
| GET | `/devoluciones` | Listar devoluciones |
| POST | `/devoluciones` | Registrar devolución |
| GET | `/configuracion` | Leer configuración del sistema |
| PUT | `/configuracion/:clave` | Actualizar parámetro de configuración |
| GET | `/exportar` | Descargar CSV unificado de préstamos y devoluciones |

---

## Lógica de Negocio

**Multa por retraso**
- Configurable desde el dashboard (por defecto: Gs. 10.000 por día)
- Se calcula automáticamente al momento de registrar la devolución
- El cambio en la configuración aplica inmediatamente al siguiente registro

**Códigos de alumno**
- Generados automáticamente: ALU001, ALU002, ALU003...
- El sistema toma el máximo histórico para nunca repetir un código aunque se eliminen registros

**Control de disponibilidad**
- Un alumno con préstamo activo no aparece en el selector de nuevos préstamos
- Un equipo prestado no se puede eliminar ni cambiar de estado manualmente
- Un alumno con préstamo activo no se puede eliminar

**Zona horaria**
- Todas las fechas se registran en hora local de Paraguay (America/Asuncion)

---

## Comandos útiles

Iniciar los contenedores:
```bash
docker compose up -d
```

Resetear la base de datos:
```bash
docker compose down -v
docker compose up -d
# Las tablas se crean automaticamente al reiniciar la app
```

Limpiar solo los datos de prueba (mantiene estructura):
```bash
docker exec -i smartloan-mysql mysql -u root -p1234 prestamos_db -e "DELETE FROM devoluciones; DELETE FROM prestamos; DELETE FROM equipos; DELETE FROM alumnos; ALTER TABLE equipos AUTO_INCREMENT = 1; ALTER TABLE alumnos AUTO_INCREMENT = 1; ALTER TABLE prestamos AUTO_INCREMENT = 1; ALTER TABLE devoluciones AUTO_INCREMENT = 1;"
```

---

## Capturas de pantalla

> Dashboard · Gestión de Equipos · Registro de Préstamos · Devolución con multa automática · Historial

---

## Licencia

Proyecto desarrollado con fines académicos.  
© 2026 Angelo Caballero — Universidad Integración de las Américas