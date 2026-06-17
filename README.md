<div align="center">
  <h1>SmartLoan IT</h1>
  <p><strong>Sistema de Gestión de Préstamos de Recursos Tecnológicos</strong></p>
  <p>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express"></a>
    <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL"></a>
    <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
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

SmartLoan IT es un sistema web moderno para la gestión de préstamos de equipos tecnológicos en instituciones educativas. Permite **registrar, controlar y hacer seguimiento** del uso de laptops, PCs y periféricos con control automático de estados, cálculo de multas por retraso, registro de daños y trazabilidad completa de todos los movimientos.

> **Problema que resuelve**: Las instituciones educativas prestan equipos a alumnos sin un sistema centralizado, perdiendo el rastro de quién tiene qué equipo, cuándo debe devolverlo y en qué condiciones lo recibió. SmartLoan IT automatiza todo ese proceso.

---

## Pantallas

<div align="center">

| Pantalla | Descripción |
|:--------:|:------------|
| **Login** | Acceso seguro por código numérico + contraseña con protección JWT |
| **Dashboard** | Métricas en vivo, gráficos, reloj, exportación y configuración en tiempo real |
| **Equipos** | CRUD completo con control de estado y búsqueda sin acentos |
| **Alumnos** | Registro con código auto-incremental (ALU001…), edición y eliminación |
| **Préstamos** | Contrato de uso, comprobante imprimible y validación de disponibilidad |
| **Devoluciones** | Búsqueda instantánea, registro de daños, multa automática |
| **Historial** | Trazabilidad completa con filtros y búsqueda en vivo |

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
- **Validaciones**: no se puede prestar un equipo ocupado, no se puede eliminar un alumno con préstamo activo

### Devoluciones y Multas
- **Multa configurable**: valor por día de retraso ajustable desde el dashboard
- **Cálculo automático** al registrar la devolución
- **Registro de daños** con clasificación (Leve/Moderado/Grave)
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
| **json2csv / exceljs** | Exportación de datos |
| **helmet** | Seguridad HTTP headers |
| **cors** | Control de acceso cross-origin |

### Frontend
| Tecnología | Uso |
|------------|-----|
| **HTML5** | Estructura semántica |
| **CSS3** | Diseño con variables, glassmorphism, grid |
| **JavaScript vanilla** | Lógica del cliente sin frameworks |
| **Chart.js** | Gráficos interactivos (donut + barras) |
| **Canvas 2D API** | Sparklines nativas en tarjetas |
| **Plus Jakarta Sans** | Tipografía principal (Google Fonts) |

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
- **Comunicación**: JSON via `fetch()` con header `Authorization: Bearer <token>`

---

## Estructura del Proyecto

```
SistemaPrestamos/
├── backend/
│   ├── server.js                 ← Entry point (Express 5)
│   ├── db.js                     ← Conexión MySQL (pool)
│   ├── initDb.js                 ← Auto-creación de tablas
│   ├── middleware/
│   │   ├── auth.js               ← JWT verification
│   │   ├── errorHandler.js       ← Manejo centralizado de errores
│   │   └── rateLimiters.js       ← Rate limiters compartidos
│   ├── controladores/
│   │   ├── encargadosControlador.js
│   │   ├── alumnosControlador.js
│   │   ├── equiposControlador.js
│   │   ├── prestamosControlador.js
│   │   └── devolucionesControlador.js
│   ├── rutas/
│   │   ├── encargados.js
│   │   ├── alumnos.js
│   │   ├── equipos.js
│   │   ├── prestamos.js
│   │   └── devoluciones.js
│   └── utils/
│       └── sanitize.js           ← Sanitización compartida
├── frontend/
│   ├── css/
│   │   ├── tokens.css            ← Variables de diseño (colores, espacios)
│   │   └── components.css        ← Componentes reutilizables
│   ├── js/
│   │   ├── api.js                ← fetch wrapper + safeJson
│   │   └── utils.js              ← normalizeText, esc, spotlight, theme
│   ├── login/login.html
│   ├── home/dashboard.html
│   ├── equipos/equipos.html
│   ├── alumnos/alumnos.html
│   ├── prestamos/prestamos.html
│   ├── devoluciones/devoluciones.html
│   └── historial/historial.html
├── query.sql
├── railway.json                  ← Config Railway (nixpacks)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Inicio Rapido

### Requisitos Previos
- [Node.js](https://nodejs.org/) v18 o superior
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
start http://localhost:3000
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
start http://localhost:3000
```

---

## Credenciales

| Rol | Codigo | Contrasena | Permisos |
|-----|--------|------------|----------|
| Solo lectura | `0000` | `CREDENCIALES_BORRADAS` | Visualizar listados y dashboard. No puede registrar, modificar ni eliminar datos |

> Los administradores tienen credenciales privadas asignadas internamente.

---

## API

> Todos los endpoints requieren autenticacion JWT (excepto `/encargados/login`).  
> Los endpoints de escritura (POST, PUT, PATCH, DELETE) requieren rol `admin`.  
> Enviar header: `Authorization: Bearer <token>`

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/encargados/login` | Iniciar sesión (retorna `{ token, usuario }`) |

### Alumnos
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/alumnos` | Listar alumnos activos | todos |
| GET | `/alumnos/disponibles` | Alumnos sin prestamo activo | todos |
| POST | `/alumnos` | Registrar nuevo alumno | admin |
| PUT | `/alumnos/:id` | Editar alumno | admin |
| DELETE | `/alumnos/:id` | Eliminar alumno | admin |

### Equipos
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/equipos` | Listar equipos | todos |
| POST | `/equipos` | Registrar nuevo equipo | admin |
| PUT | `/equipos/:id` | Editar equipo | admin |
| PATCH | `/equipos/:id/estado` | Cambiar estado | admin |
| DELETE | `/equipos/:id` | Eliminar equipo | admin |

### Prestamos
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/prestamos` | Listar prestamos | todos |
| POST | `/prestamos` | Registrar prestamo | admin |
| GET | `/prestamos/:id` | Buscar prestamo activo por ID | todos |

### Devoluciones
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/devoluciones` | Listar devoluciones | todos |
| POST | `/devoluciones` | Registrar devolucion | admin |

### Configuracion
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/configuracion` | Leer parametros del sistema | todos |
| PUT | `/configuracion/:clave` | Actualizar parametro | admin |

### Exportacion
| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/exportar` | Descargar Excel (.xlsx) con todos los registros | admin |

---

## Logica de Negocio

| Regla | Comportamiento |
|-------|---------------|
| **Multa por retraso** | Configurable desde dashboard (por defecto: Gs. 10.000/día). Se calcula automáticamente al registrar la devolución. El cambio tiene efecto inmediato. |
| **Códigos de alumno** | Generación automática: `ALU001`, `ALU002`, … Toma el máximo histórico para evitar duplicados. |
| **Control de disponibilidad** | Un alumno con préstamo activo no aparece en el selector de nuevos préstamos. |
| **Protección de datos** | Un equipo prestado no se puede eliminar ni cambiar de estado manualmente. Un alumno con préstamo activo no se puede eliminar. |
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
8. Inicia sesión con las [credenciales por defecto](#-credenciales)

> La base de datos y tablas se crean automáticamente en el primer inicio.

---

## Comandos Utiles

```bash
# Iniciar contenedores
docker compose up -d

# Ver logs del backend
docker compose logs -f app

# Resetear base de datos
docker compose down -v
docker compose up -d

# Limpiar solo datos (mantiene estructura)
docker exec -i smartloan-mysql mysql -u root -p1234 prestamos_db -e "
  DELETE FROM devoluciones;
  DELETE FROM prestamos;
  DELETE FROM equipos;
  DELETE FROM alumnos;
  ALTER TABLE equipos AUTO_INCREMENT = 1;
  ALTER TABLE alumnos AUTO_INCREMENT = 1;
  ALTER TABLE prestamos AUTO_INCREMENT = 1;
  ALTER TABLE devoluciones AUTO_INCREMENT = 1;
"

# Acceder a la base de datos
docker exec -it smartloan-mysql mysql -u root -p1234 prestamos_db
```

---

## Licencia

Proyecto desarrollado con fines académicos.

© 2026 Angelo Caballero — Universidad Integración de las Américas
