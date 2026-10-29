<div align="center">
  <h1>SmartLoan IT</h1>
  <p><strong>Sistema de Gestión de Préstamos de Recursos Tecnológicos para Colegios</strong></p>
  <p>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express"></a>
    <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL"></a>
    <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
    <a href="https://github.com/Angelo17-Py/smartloan-it/actions/workflows/ci.yml"><img src="https://github.com/Angelo17-Py/smartloan-it/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://jwt.io/"><img src="https://img.shields.io/badge/JWT-auth-e34f26?style=flat-square&logo=json-web-tokens&logoColor=white" alt="JWT"></a>
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT">
  </p>
  <p>
    <sub>Proyecto de Grado — Ingeniería en Informática · UNIDA 2026</sub><br>
    <sub>Autor: <strong>Angelo Caballero</strong></sub>
  </p>
</div>

---

## Tabla de Contenidos

- [Descripcion](#descripcion)
- [Pantallas](#pantallas)
- [Caracteristicas](#caracteristicas)
- [Tecnologias](#tecnologias)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Inicio Rapido](#inicio-rapido)
- [Credenciales](#credenciales)
- [API](#api)
- [Logica de Negocio](#logica-de-negocio)
- [Base de Datos](#base-de-datos)
- [Deploy en Railway](#deploy-en-railway)
- [Comandos Utiles](#comandos-utiles)

---

## Descripcion

SmartLoan IT es un sistema web moderno para la gestión de préstamos de equipos tecnológicos en instituciones educativas. Permite **registrar, controlar y hacer seguimiento** del uso de laptops, PCs y periféricos con control automático de estados, cálculo de multas por retraso, registro de daños y trazabilidad completa de todos los movimientos. Incluye **notificaciones de vencimiento**, **auditoría de acciones** y **gestión de usuarios con roles**.

> **Problema que resuelve**: Las instituciones educativas prestan equipos a alumnos sin un sistema centralizado, perdiendo el rastro de quién tiene qué equipo, cuándo debe devolverlo y en qué condiciones lo recibió. SmartLoan IT automatiza todo ese proceso.

---

## Pantallas

<div align="center">

| Pantalla | Descripción |
|:--------:|:------------|
| **Login** | Acceso seguro por código de usuario + contraseña con protección JWT |
| **Dashboard** | Métricas en vivo, gráficos, reloj, exportación y configuración en tiempo real |
| **Equipos** | CRUD completo con control de estado y búsqueda sin acentos |
| **Alumnos** | Registro con código auto-incremental (ALU001…), edición y desactivación |
| **Préstamos** | Contrato de uso, comprobante imprimible y validación de disponibilidad |
| **Devoluciones** | Búsqueda instantánea, registro de daños, multa automática |
| **Historial** | Trazabilidad completa con filtros, búsqueda en vivo y pestaña de auditoría (admin) |
| **Usuarios** | Gestión de encargados, roles, activación/desactivación y contraseñas (solo admin) |

</div>

---

## Caracteristicas

### Dashboard Interactivo
- **Métricas en vivo** con animación de números (`requestAnimationFrame`)
- **Gráficos Chart.js**: donut de distribución de equipos y barras de préstamos mensuales
- **Sparklines** dibujadas con Canvas 2D nativo en cada tarjeta métrica
- **Reloj** en tiempo real con zona horaria de Paraguay
- **Polling** cada 30 segundos para datos siempre actualizados
- Sidebar glass con navegación, avatar, tema oscuro/claro y cierre de sesión

### Gestión Inteligente
- **Búsqueda sin acentos**: normalización Unicode (NFD) en todas las pantallas
- **Códigos automáticos**: alumnos con prefijo `ALU` + correlativo auto-incremental
- **Disponibilidad inteligente**: alumnos con préstamo activo no aparecen en el selector
- **Validaciones**: no se puede prestar un equipo ocupado, no se puede desactivar un alumno con préstamo activo

### Notificaciones de Vencimiento
- **Campana global** en todas las páginas del sistema
- Muestra préstamos **vencidos** y **por vencer en las próximas 48 horas**
- Contador de alertas sin leer, detalle con alumno, equipo, código y fecha
- Acceso directo a la devolución con el préstamo ya seleccionado
- Actualización automática cada 60 segundos y al volver a la pestaña

### Roles y Permisos
- **Administrador**: todas las tareas diarias + gestión de usuarios, configuración, auditoría y eliminaciones
- **Operador**: registra alumnos, equipos, préstamos y devoluciones; edita datos y cambia estados
- Las funciones administrativas (usuarios, configuración, auditoría y eliminaciones) quedan restringidas al rol admin
- Los roles se validan en el backend; la interfaz oculta las acciones no permitidas

### Auditoría
- Registro de **login, altas, ediciones, cambios de estado, activaciones/desactivaciones y eliminaciones**
- Guarda usuario, acción, módulo, ID afectado, detalle, IP y fecha
- En eliminaciones conserva un resumen del registro borrado
- Pestaña **Auditoría** en Historial, disponible solo para administradores

### Gestión de Usuarios (admin)
- Alta de encargados con código único, rol y contraseña
- Edición de datos, rol y contraseña con confirmación
- Activación y desactivación de cuentas
- Protecciones: no se puede desactivar la propia cuenta ni dejar el sistema sin un administrador activo

### Devoluciones y Multas
- **Multa configurable**: valor por día de retraso ajustable desde el dashboard
- **Cálculo automático** al registrar la devolución
- **Registro de daños** con tipo, descripción y monto de reparación
- Actualización inmediata del estado del equipo (Disponible / En mantenimiento)

### Exportación
- Descarga de **Excel (.xlsx)** con formato profesional
- Barra de progreso animada y feedback visual
- Metadata de última exportación guardada en localStorage
- Contador de préstamos, devoluciones y alumnos exportados

### Experiencia de Usuario
- **Tema oscuro/claro** con persistencia y animación suave
- **Spotlight search** (Ctrl+K / ⌘K) para navegación rápida
- **Toast notifications** para feedback de acciones
- **Skeleton loading** en gráficos mientras cargan datos
- Diseño 100% responsive (sidebar → drawer en mobile)

---

## Tecnologias

### Backend
| Tecnología | Uso |
|------------|-----|
| **Node.js 22** | Entorno de ejecución |
| **Express 5** | Framework web con soporte de promesas nativo |
| **MySQL 8.0** | Base de datos relacional |
| **mysql2** | Driver MySQL con promesas |
| **JWT** | Autenticación basada en tokens |
| **bcrypt** | Hash de contraseñas |
| **express-rate-limit** | Protección contra fuerza bruta |
| **exceljs** | Exportación de datos a Excel |
| **cors** | Control de acceso cross-origin |

### Frontend
| Tecnología | Uso |
|------------|-----|
| **HTML5** | Estructura semántica |
| **CSS3** | Diseño con variables, glassmorphism, grid |
| **JavaScript vanilla** | Lógica del cliente sin frameworks |
| **Chart.js** | Gráficos interactivos (donut + barras) |
| **Canvas 2D API** | Sparklines nativas en tarjetas |
| **Instrument Sans + DM Mono** | Tipografía principal y monoespaciada (Google Fonts) |

### DevOps
| Herramienta | Uso |
|-------------|-----|
| **Docker** | Contenedorización de la aplicación |
| **Docker Compose** | Orquestación multicontenedor |
| **Railway** | Plataforma de deploy gratuita |
| **Nixpacks** | Builder automático para Railway |

---

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Frontend   │────▶│  Express 5   │────▶│  MySQL  │
│  (vanilla)  │◀────│  REST API    │◀────│   8.0   │
└─────────────┘     └──────────────┘     └─────────┘
                           │
                    ┌──────┴──────┐
                    │  JWT Auth   │
                    │  (middleware)│
                    └─────────────┘
```

- **Frontend**: archivos HTML estáticos servidos por Express como contenido público
- **Backend**: API REST con autenticación JWT en cada endpoint (excepto login)
- **Base de datos**: MySQL con triggers automáticos para mantener consistencia
- **Comunicación**: JSON via `fetch()`; autenticación con cookie httpOnly `sl_token` (también acepta `Authorization: Bearer <token>`)

---

## Estructura del Proyecto

```
SistemaPrestamos/
├── backend/
│   ├── server.js                 ← Entry point (Express 5)
│   ├── db.js                     ← Conexión MySQL (pool)
│   ├── initDb.js                 ← Auto-creación de tablas y datos iniciales
│   ├── middleware/
│   │   ├── auth.js               ← Verificación JWT
│   │   ├── requireAdmin.js       ← Control de rol administrador
│   │   ├── errorHandler.js       ← Manejo centralizado de errores
│   │   └── rateLimiters.js       ← Rate limiters compartidos
│   ├── controladores/
│   │   ├── encargadosControlador.js
│   │   ├── alumnosControlador.js
│   │   ├── equiposControlador.js
│   │   ├── prestamosControlador.js
│   │   ├── devolucionesControlador.js
│   │   └── configuracionControlador.js
│   ├── rutas/
│   │   ├── encargados.js
│   │   ├── alumnos.js
│   │   ├── equipos.js
│   │   ├── prestamos.js
│   │   ├── devoluciones.js
│   │   ├── configuracion.js
│   │   └── auditoria.js
│   └── utils/
│       ├── sanitize.js           ← Sanitización compartida
│       └── auditoria.js          ← Registro de acciones
├── frontend/
│   ├── css/
│   │   ├── tokens.css            ← Variables de diseño (colores, espacios)
│   │   └── components.css        ← Componentes reutilizables
│   ├── js/
│   │   ├── api.js                ← fetch wrapper + safeJson
│   │   └── utils.js              ← normalizeText, esc, spotlight, tema, notificaciones
│   ├── login/login.html
│   ├── home/dashboard.html
│   ├── equipos/equipos.html
│   ├── alumnos/alumnos.html
│   ├── prestamos/prestamos.html
│   ├── devoluciones/devoluciones.html
│   ├── historial/historial.html
│   └── usuarios/usuarios.html    ← Gestión de usuarios (admin)
├── test/                         ← Pruebas de autenticación y sanitización
├── .github/workflows/ci.yml      ← CI (npm test)
├── query.sql
├── railway.json                  ← Config Railway (nixpacks)
├── Dockerfile.local
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Inicio Rapido

### Requisitos Previos
- [Node.js](https://nodejs.org/) v22 o superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### Opción 1: Docker Compose (recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Angelo17-Py/smartloan-it.git
cd smartloan-it

# 2. Iniciar MySQL + App
docker compose up -d

# 3. Cargar datos iniciales
docker exec -i smartloan-app node backend/initDb.js

# 4. Abrir en el navegador
start http://localhost:1002
```

### Opción 2: Manual (sin Docker)

```bash
# 1. Clonar
git clone https://github.com/Angelo17-Py/smartloan-it.git
cd smartloan-it

# 2. Crear base de datos MySQL local
#    (asegúrate de tener MySQL 8.0 corriendo en puerto 3306)

# 3. Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales MySQL

# 4. Instalar dependencias
npm install

# 5. Inicializar base de datos
node backend/initDb.js

# 6. Iniciar servidor
npm start

# 7. Abrir en el navegador
start http://localhost:1002
```

---

## Credenciales

| Rol | Código | Contraseña | Permisos |
|-----|--------|------------|----------|
| **Administrador** | Asignado por el departamento | Asignada por el departamento | Tareas diarias + usuarios, configuración, auditoría y eliminaciones |
| **Operador** | Asignado por el departamento | Asignada por el departamento | Alumnos, equipos, préstamos, devoluciones y cambios de estado |
| **Invitado** | `0000` | `V1su4l#2026` | Acceso de demostración con permisos de operador |

> El administrador principal del sistema es **Angelo Caballero** (código `1001`).  
> Los administradores pueden crear, editar, activar/desactivar usuarios y cambiar contraseñas desde la pantalla **Usuarios**.  
> Cambiá las contraseñas iniciales antes de usar el sistema en producción.

---

## API

> Todos los endpoints requieren autenticación (cookie httpOnly `sl_token` o `Authorization: Bearer <token>`), excepto el login.  
> **Operador**: consulta y tareas diarias (alumnos, equipos, préstamos, devoluciones y estados).  
> **Administrador**: además gestiona usuarios, configuración, auditoría y eliminaciones.

### Autenticación y Usuarios
| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/encargados/login` | Iniciar sesión (retorna `{ token, usuario }`) | público |
| POST | `/encargados/logout` | Cerrar sesión | todos |
| GET | `/encargados` | Listar usuarios activos e inactivos | admin |
| POST | `/encargados` | Crear usuario | admin |
| PUT | `/encargados/:id` | Editar datos, rol y contraseña | admin |
| PATCH | `/encargados/:id/estado` | Activar o desactivar usuario | admin |

### Alumnos
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/alumnos` | Listar alumnos activos | todos |
| GET | `/alumnos/disponibles` | Alumnos sin préstamo activo | todos |
| GET | `/alumnos/:id/historial` | Historial de préstamos del alumno | todos |
| POST | `/alumnos` | Registrar nuevo alumno | operador/admin |
| PUT | `/alumnos/:id` | Editar alumno | operador/admin |
| DELETE | `/alumnos/:id` | Desactivar alumno | admin |

### Equipos
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/equipos` | Listar equipos | todos |
| GET | `/equipos/disponibles` | Equipos disponibles | todos |
| GET | `/equipos/:id/historial` | Historial de préstamos del equipo | todos |
| POST | `/equipos` | Registrar nuevo equipo | operador/admin |
| PUT | `/equipos/:id` | Editar equipo | operador/admin |
| PATCH | `/equipos/:id/estado` | Cambiar estado | operador/admin |
| DELETE | `/equipos/:id` | Eliminar equipo (sin historial) | admin |

### Prestamos
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/prestamos` | Listar préstamos | todos |
| GET | `/prestamos/alertas` | Vencidos y por vencer en 48 horas | todos |
| POST | `/prestamos` | Registrar préstamo | operador/admin |
| GET | `/prestamos/:id` | Buscar préstamo activo por ID | todos |
| DELETE | `/prestamos/:id` | Eliminar préstamo y su devolución | admin |

### Devoluciones
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/devoluciones` | Listar devoluciones | todos |
| POST | `/devoluciones` | Registrar devolución | operador/admin |
| DELETE | `/devoluciones/:id` | Eliminar devolución y reactivar préstamo | admin |

### Configuracion
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/configuracion` | Leer parámetros del sistema | todos |
| PUT | `/configuracion/:clave` | Actualizar parámetro | admin |

### Auditoria
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/auditoria` | Listar acciones registradas (`?limit=` hasta 500) | admin |

### Exportacion
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/exportar` | Descargar Excel (.xlsx) con todos los registros | operador/admin |

---

## Logica de Negocio

| Regla | Comportamiento |
|-------|---------------|
| **Multa por retraso** | Configurable desde dashboard (por defecto: Gs. 10.000/día). Se calcula automáticamente al registrar la devolución. El cambio tiene efecto inmediato. |
| **Códigos de alumno** | Generación automática: `ALU001`, `ALU002`, … Toma el máximo histórico para evitar duplicados. |
| **Control de disponibilidad** | Un alumno con préstamo activo no aparece en el selector de nuevos préstamos. |
| **Roles y permisos** | El operador realiza las tareas diarias; el administrador además gestiona usuarios, configuración, auditoría y eliminaciones. |
| **Notificaciones** | Se consideran próximos a vencer los préstamos activos con devolución estimada dentro de las próximas 48 horas. |
| **Auditoría** | Toda acción administrativa u operativa relevante se registra con usuario, fecha, IP y detalle; las eliminaciones guardan un resumen previo. |
| **Usuarios** | Código único, contraseña mínima de 6 caracteres y confirmación. No se puede desactivar la propia cuenta ni dejar el sistema sin un administrador activo. |
| **Protección de datos** | Un equipo prestado no se puede eliminar ni cambiar de estado manualmente. Un alumno con préstamo activo no se puede desactivar. |
| **Zona horaria** | Todas las fechas se registran en hora local de Paraguay (`America/Asuncion`). |
| **Triggers automáticos** | El estado del equipo se actualiza solo al crear un préstamo o devolución (via MySQL triggers). |

---

## Base de Datos

### Tablas

| Tabla | Propósito |
|-------|-----------|
| `encargados` | Usuarios del sistema (login, roles) |
| `alumnos` | Registro de alumnos |
| `equipos` | Activos tecnológicos (laptops, PCs, periféricos) |
| `prestamos` | Registro de salida de equipos |
| `devoluciones` | Registro de retorno con daños y multas |
| `configuracion` | Parámetros del sistema (multa por día, etc.) |
| `auditoria` | Registro de acciones: usuario, acción, módulo, detalle, IP y fecha |

### Triggers Automáticos

| Trigger | Efecto |
|---------|--------|
| `validar_prestamo` | Impide prestar un equipo que no esté `Disponible` |
| `actualizar_estado_prestamo` | Al crear préstamo → equipo pasa a `Prestado` |
| `actualizar_estado_devolucion` | Al crear devolución → equipo pasa a `Disponible` o `En mantenimiento` (según daños) |

---

## Deploy en Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Angelo17-Py/smartloan-it)

### Pasos Manuales

1. Crea una cuenta en [railway.app](https://railway.app/) con tu GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona `Angelo17-Py/smartloan-it`
4. Agrega un plugin **MySQL** desde el dashboard
5. Configura las variables de entorno:
   - `JWT_SECRET` → cualquier clave secreta (ej: `SmartLoanIT_Produccion_2026`)
6. Railway iniciará el deploy automáticamente
7. Abre la URL asignada (ej: `smartloan-it.up.railway.app`)
8. Inicia sesión con tu usuario administrador u operador, o con el invitado de demostración ([credenciales](#credenciales))

> La base de datos y tablas se crean automáticamente en el primer inicio.

---

## Comandos Utiles

```bash
# Iniciar contenedores
docker compose up -d

# Ver logs del backend
docker compose logs -f app

# Ejecutar pruebas automatizadas
npm test

# Resetear base de datos
docker compose down -v
docker compose up -d

# Limpiar solo datos (mantiene estructura)
docker exec -i smartloan-mysql mysql -u root -p1234 prestamos_db -e "
  DELETE FROM devoluciones;
  DELETE FROM prestamos;
  DELETE FROM equipos;
  DELETE FROM alumnos;
  DELETE FROM auditoria;
  ALTER TABLE equipos AUTO_INCREMENT = 1;
  ALTER TABLE alumnos AUTO_INCREMENT = 1;
  ALTER TABLE prestamos AUTO_INCREMENT = 1;
  ALTER TABLE devoluciones AUTO_INCREMENT = 1;
  ALTER TABLE auditoria AUTO_INCREMENT = 1;
"

# Acceder a la base de datos
docker exec -it smartloan-mysql mysql -u root -p1234 prestamos_db
```

---

## Licencia

Proyecto desarrollado con fines académicos.

© 2026 Angelo Caballero — Universidad Integración de las Américas
