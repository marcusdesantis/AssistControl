# AssistControl — Sistema de Gestión de Asistencia

Plataforma SaaS multi-tenant para el control de asistencia de empleados. Compuesta por tres proyectos independientes: backend de microservicios, dashboard web y app móvil.

---

## Arquitectura general

```
                         Internet
                            │
                     Puerto 80 (público)
                            │
              ┌─────────────▼─────────────┐
              │   aiattendance-frontend    │
              │   nginx · Docker           │
              │   (attendance-frontend)    │
              └─────────────┬─────────────┘
                            │
          ┌─────────────────┼──────────────────────┐
          │                 │                       │
    /  /precios         /api/v1/...            resto (SPA)
    /_next/                 │                  index.html
          │                 │
          │          Puerto 8080 (interno)
          │                 │
          └────────┬────────┘
                   │
      ┌────────────▼────────────┐
      │  attendance-nextjs      │
      │  nginx · Docker Compose │
      │  Gateway · CORS         │
      └────────────┬────────────┘
                   │
   ┌───────────────┼───────────────────────────┐
   │               │               │           │
svc-core      svc-employees  svc-attendance  svc-analytics
:3001          :3002          :3003           :3004
Auth/Empresa   Empleados      Asistencia      Dashboard
Notific.       Depto/Cargos   Horarios        Reportes
   │               │               │           │
svc-mobile     svc-comms      svc-billing   svc-admin
:3005          :3006          :3007          :3008
API Móvil      Mensajería     Facturación   Superadmin
Checker        Comunicados    Suscripciones Gestión
   │
svc-support    svc-landing
:3009          :3010
Tickets        Landing page
Soporte        SSR (Next.js)
                   │
          ┌────────▼────────┐
          │   PostgreSQL    │
          │   Host :5432    │
          └─────────────────┘
```

---

## Servidor de producción

- **IP:** `167.86.87.213`
- **Dominio (pendiente de adquirir):** `tiempoya.net`
- **Directorio:** `~/proyectos/opt/attendance-ia/`

### Contenedores en ejecución

| Contenedor | Puerto host | Descripción |
|---|---|---|
| `aiattendance-frontend` | **80** | Nginx principal — sirve SPA + proxy al backend |
| `attendance-nextjs-nginx-1` | **8080** | Gateway de APIs + landing page |
| `attendance-nextjs-svc-core-1` | interno 3001 | Auth, empresa, settings |
| `attendance-nextjs-svc-employees-1` | interno 3002 | Empleados, departamentos |
| `attendance-nextjs-svc-attendance-1` | interno 3003 | Asistencia, horarios |
| `attendance-nextjs-svc-analytics-1` | interno 3004 | Dashboard, reportes |
| `attendance-nextjs-svc-mobile-1` | interno 3005 | API móvil |
| `attendance-nextjs-svc-comms-1` | interno 3006 | Mensajería |
| `attendance-nextjs-svc-billing-1` | interno 3007 | Facturación, planes |
| `attendance-nextjs-svc-admin-1` | interno 3008 | Superadmin |
| `attendance-nextjs-svc-support-1` | interno 3009 | Soporte tickets |
| `attendance-nextjs-svc-landing-1` | interno 3010 | Landing page SSR |
| `attendance_api` | 5000 | API antigua — **no tocar** |
| `sql_server_attendance` | 1433 | SQL Server antiguo — **no tocar** |

### Enrutamiento (puerto 80)

| Ruta | Destino |
|---|---|
| `/` exacto | proxy → 8080 → svc-landing |
| `/precios` | proxy → 8080 → svc-landing |
| `/_next/` | proxy → 8080 → svc-landing (assets) |
| `/api/v1/...` | proxy → 8080 → microservicio correspondiente |
| resto | SPA React (index.html) |

---

## Proyectos

### 1. `attendance-nextjs` — Backend (Microservicios)

Backend monorepo con 10 microservicios Next.js 15 detrás de un gateway Nginx.

**Stack:**
- Next.js 15 · TypeScript · Prisma 5 · PostgreSQL
- pnpm workspaces · Docker Compose
- JWT · Zod · Nodemailer · Payphone

**Servicios:**

| Servicio | Puerto | Responsabilidad |
|---|---|---|
| svc-core | 3001 | Auth, empresa, ajustes, notificaciones |
| svc-employees | 3002 | Empleados, departamentos, cargos |
| svc-attendance | 3003 | Asistencia, horarios |
| svc-analytics | 3004 | Dashboard, reportes |
| svc-mobile | 3005 | API móvil, checker |
| svc-comms | 3006 | Mensajería |
| svc-billing | 3007 | Facturación, suscripciones, pagos |
| svc-admin | 3008 | Panel superadmin, tenants, planes |
| svc-support | 3009 | Tickets de soporte (SSE real-time) |
| svc-landing | 3010 | Landing page pública SSR |

**Variables de entorno (`attendance-nextjs/.env`):**
```env
DATABASE_URL=postgresql://postgres:PASSWORD@host.docker.internal:5432/attendance
JWT_SECRET=secreto_largo_aleatorio
JWT_EXPIRES_IN=1440m
SUPERADMIN_JWT_SECRET=otro_secreto_largo
NGINX_PORT=8080                        # En producción usar 8080 (80 lo ocupa el frontend)
APP_URL=http://167.86.87.213           # URL pública — cambiar al dominio cuando se adquiera
FRONTEND_URL=http://167.86.87.213
PAYPHONE_TOKEN=tu_token
PAYPHONE_STORE_ID=tu_store_id
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
POSTGRES_DB=attendance
```

**Cómo ejecutar (local):**
```bash
# 1. Instalar dependencias
cd attendance-nextjs
pnpm install

# 2. Crear esquema y datos iniciales
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attendance" \
  npx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/attendance" \
  npx tsx packages/shared/prisma/seed.ts

# 3. Levantar servicios
docker compose up -d
```

**Actualizar en producción:**
```bash
cd ~/proyectos/opt/attendance-ia/attendance-nextjs
git pull
# Reconstruir solo los servicios modificados:
docker compose build svc-core svc-landing   # ejemplo
docker compose up -d
```

**Credenciales iniciales (seed):**
- Superadmin: `superadmin@assistcontrol.com` / `SuperAdmin123!`
- Admin demo: `admin@demo.com` / `Admin123!`
- Empleado demo: `emp001` / `Pass1234!` · PIN: `1234`

**Documentación API:** `http://167.86.87.213:8080/docs`

---

### 2. `attendance-frontend` — Dashboard Web

Panel de administración para empresas, supervisores y empleados. Se sirve como contenedor Docker independiente en el puerto 80, actuando también como proxy hacia el backend.

**Stack:**
- React 18 · Vite · TypeScript · Tailwind CSS
- Zustand (persistido en `localStorage` con clave `attendance-auth`)
- React Query · React Hook Form · Zod · Axios · React Router v6

**Módulos principales:**

| Módulo | Descripción |
|---|---|
| Dashboard | KPIs, resumen de asistencia del día |
| Empleados | CRUD completo, importación masiva |
| Organización | Departamentos y cargos |
| Horarios | Creación y asignación de horarios |
| Asistencia | Registros, marcación manual, exportación |
| Mensajes | Comunicación interna |
| Reportes | Reportes por empleado, período, departamento |
| Empresa | Perfil, configuración SMTP |
| Checker | Estación de marcación por PIN/QR |
| Soporte | Tickets con chat en tiempo real (SSE) |
| Superadmin `/sys` | Gestión de tenants, planes, suscripciones, facturas |

**Variables de entorno (`.env` para Vite local):**
```env
VITE_API_URL=http://localhost:80
```

**Cómo ejecutar en desarrollo:**
```bash
cd attendance-frontend
npm install
npm run dev        # http://localhost:5173
```

**Actualizar en producción** (el contenedor NO usa docker-compose, se gestiona manualmente):
```bash
cd ~/proyectos/opt/attendance-ia/attendance-frontend
git pull
docker build --add-host=host.docker.internal:host-gateway -t aiattendance-frontend .
docker stop aiattendance-frontend && docker rm aiattendance-frontend
docker run -d --name aiattendance-frontend --add-host=host.docker.internal:host-gateway -p 80:80 aiattendance-frontend
```

> **Importante:** El flag `--add-host=host.docker.internal:host-gateway` es obligatorio. Sin él el nginx del frontend no puede hacer proxy al backend en el puerto 8080.

**nginx del frontend** (`attendance-frontend/nginx.conf`):
- `/` y `/precios` y `/_next/` → proxy a `host.docker.internal:8080` (svc-landing)
- `/api/v1/` → proxy a `host.docker.internal:8080` (microservicios)
- resto → SPA `index.html`

---

### 3. `attendance-mobile` — App Móvil (TiempoYa)

App para empleados — marcación de entrada/salida con GPS.

**Stack:**
- Expo 52 · React Native 0.76 · TypeScript
- Expo Router · Zustand · Axios
- Expo Location · Expo Notifications · Expo Secure Store

**Pantallas:**

| Pantalla | Descripción |
|---|---|
| Login | Acceso con usuario/PIN |
| Inicio | Botones entrada/salida con GPS |
| Historial | Asistencia mensual, horas trabajadas |
| Perfil | Datos del empleado, cerrar sesión |
| Notificaciones | Avisos del sistema |

**Variables de entorno:**
```env
# Producción
EXPO_PUBLIC_API_URL=https://www.tiempoya.net

# Local (desarrollo)
EXPO_PUBLIC_API_URL=http://192.168.X.X:8080
```

> ⚠️ Verificar siempre que el `.env` apunte a producción antes de compilar la APK.

**Cómo ejecutar en desarrollo:**
```bash
cd attendance-mobile
npm install
npm start          # Expo Go (escanear QR)
npm run android    # Emulador Android
npm run ios        # Simulador iOS
```

**Generar APK (Windows) — primera vez o tras clonar el repo:**

Requisitos: Android Studio instalado con el SDK, Java 17.

```powershell
# 1. Configurar variables de entorno (hacer una sola vez en el sistema)
#    Panel de control > Variables de entorno > Nueva variable del sistema:
#    ANDROID_HOME = C:\Users\<tu-usuario>\AppData\Local\Android\Sdk
#    JAVA_HOME    = C:\Program Files\Java\jdk-17

# 2. Instalar dependencias
cd attendance-mobile
npm install

# 3. Verificar que .env apunte a producción
# EXPO_PUBLIC_API_URL=https://www.tiempoya.net

# 4. Generar carpeta android/ (solo si no existe o si se agregó un plugin nativo)
npx expo prebuild --platform android

# 5. Aplicar fix de Kotlin (OBLIGATORIO tras cada prebuild)
#    En android/build.gradle, buscar esta línea:
#        classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
#    Y reemplazarla por:
#        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")

# 6. Compilar la APK
cd android
.\gradlew.bat assembleRelease

# APK generada en:
# android\app\build\outputs\apk\release\app-release.apk
```

**Generar APK — cuando ya existe la carpeta `android/` (actualizaciones de código):**

```powershell
# Solo recompilar, no hace falta prebuild ni reaplicar el fix
cd attendance-mobile\android
.\gradlew.bat assembleRelease

# APK generada en:
# android\app\build\outputs\apk\release\app-release.apk
```

**Si el build falla con error de Kotlin/Compose Compiler:**

Abrir `android/build.gradle` y verificar que la línea del plugin de Kotlin sea:
```gradle
classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")
```
Si dice `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')` sin versión, corregirlo y volver a compilar.

**Instalar APK en el teléfono:**
```powershell
# Via USB (con Depuración USB activada en el teléfono)
C:\Users\<usuario>\AppData\Local\Android\Sdk\platform-tools\adb.exe install android\app\build\outputs\apk\release\app-release.apk
```
O copiar el `.apk` al teléfono e instalarlo manualmente (requiere "Fuentes desconocidas" habilitado).

---

## Instalación inicial en servidor nuevo

```bash
# 1. Clonar los repos
git clone <repo-attendance-nextjs>  ~/proyectos/opt/attendance-ia/attendance-nextjs
git clone <repo-attendance-frontend> ~/proyectos/opt/attendance-ia/attendance-frontend

# 2. Configurar PostgreSQL en el host
sudo -u postgres psql -c "CREATE DATABASE attendance;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'tu_password';"

# 3. Configurar .env del backend
cd ~/proyectos/opt/attendance-ia/attendance-nextjs
cp .env.example .env
nano .env   # Rellenar con valores reales (ver sección Variables de entorno)

# 4. Crear esquema y seed
DATABASE_URL='postgresql://postgres:tu_password@localhost:5432/attendance' \
  npx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma

DATABASE_URL='postgresql://postgres:tu_password@localhost:5432/attendance' \
  npx tsx packages/shared/prisma/seed.ts

# 5. Levantar backend (puerto 8080)
docker compose up -d

# 6. Construir y levantar frontend (puerto 80)
cd ~/proyectos/opt/attendance-ia/attendance-frontend
docker build --add-host=host.docker.internal:host-gateway -t aiattendance-frontend .
docker run -d --name aiattendance-frontend --add-host=host.docker.internal:host-gateway -p 80:80 aiattendance-frontend
```

---

## Migraciones de base de datos

```bash
DATABASE_URL='postgresql://postgres:tu_password@localhost:5432/attendance' \
  npx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma
```

---

## Backup de base de datos

```bash
# Crear script de backup
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
mkdir -p ~/backups
pg_dump -U postgres attendance > ~/backups/attendance_$(date +%Y%m%d_%H%M%S).sql
ls -t ~/backups/attendance_*.sql | tail -n +8 | xargs rm -f 2>/dev/null
EOF
chmod +x ~/backup-db.sh

# Cron diario a las 2am
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-db.sh") | crontab -
```

---

## Dominio y SSL (pendiente)

Cuando se adquiera el dominio `tiempoya.net`:

1. Apuntar DNS `A` a `167.86.87.213`
2. Actualizar `APP_URL` en `attendance-nextjs/.env`:
   ```env
   APP_URL=https://www.tiempoya.net
   ```
3. Instalar Certbot y configurar SSL en nginx
4. Reconstruir `svc-landing`: `docker compose build svc-landing && docker compose up -d svc-landing`

---

## CI/CD — Jenkins (Deploy automático)

Jenkins corre en el VPS en el puerto `9090`: `http://167.86.87.213:9090`

### Estado de la configuración

| Fase | Descripción | Estado |
|---|---|---|
| Fase 1 | Instalar Jenkins en el servidor | ✅ Completado |
| Fase 2 | Instalar plugins (GitHub Integration + SSH Agent) | ✅ Completado |
| Fase 3 | Credenciales en Jenkins (DATABASE_URL + github-ssh) | ✅ Completado |
| Fase 4 | Crear Jenkinsfile en la raíz del repo | ✅ Completado |
| Fase 5 | Crear Job `tiempoya-deploy` en Jenkins | ✅ Completado (pendiente URL del repo) |
| Fase 6 | Configurar GitHub (Deploy key o Personal Access Token) | ⏳ Pendiente — requiere acceso del dueño del repo |
| Fase 7 | Configurar Webhook en GitHub | ⏳ Pendiente |
| Fase 8 | Probar el pipeline completo | ⏳ Pendiente |

### Instalación de Jenkins (comando usado)

```bash
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 9090:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /root/proyectos:/root/proyectos \
  -u root \
  jenkins/jenkins:lts
```

### Credenciales configuradas en Jenkins

| ID | Tipo | Descripción |
|---|---|---|
| `DATABASE_URL` | Secret text | Conexión a PostgreSQL de producción |
| `github-ssh` | SSH Username with private key | Clave SSH para acceder al repo de GitHub |

### Clave pública SSH (para agregar en GitHub como Deploy key)

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGi4x4DSASS50ygxbcW7dDHg0Cg2CEtGmK4bgVJhHkxR jenkins@tiempoya
```

### Pasos pendientes para terminar la configuración

**Paso 1 — El dueño del repo debe hacer UNA de estas dos opciones:**

**Opción A — Deploy key** (recomendada):
- GitHub → repo → Settings → Deploy keys → Add deploy key
- Title: `Jenkins VPS`
- Key: la clave pública de arriba
- Allow write access: NO

**Opción B — Personal Access Token**:
- GitHub → avatar → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token → scope: `repo` → sin expiración
- Pasar el token al administrador de Jenkins

**Paso 2 — En Jenkins**, una vez resuelto el acceso:
- Ir al Job `tiempoya-deploy` → Configure → Pipeline
- En Credentials seleccionar `github-ssh`
- Verificar que la URL del repo no muestre error
- Guardar

**Paso 3 — Configurar Webhook en GitHub**:
- GitHub → repo → Settings → Webhooks → Add webhook
- Payload URL: `http://167.86.87.213:9090/github-webhook/`
- Content type: `application/json`
- Trigger: `Just the push event`

**Paso 4 — Probar el pipeline**:
- En Jenkins → Job `tiempoya-deploy` → Build Now
- Verificar que los 4 stages (Pull, Migrar DB, Deploy Backend, Deploy Frontend) pasen en verde

---

## Tecnologías principales

| Categoría | Tecnología |
|---|---|
| Backend | Next.js 15, Prisma 5, PostgreSQL 16 |
| Frontend | React 18, Vite, Tailwind CSS |
| Móvil | Expo 52, React Native 0.76 |
| Infraestructura | Docker, Nginx, pnpm workspaces |
| Auth | JWT, bcryptjs |
| Pagos | Payphone |
| Email | Nodemailer, SMTP |
| SEO/Landing | Next.js SSR (svc-landing) |
| Tiempo real | SSE (Server-Sent Events) |
