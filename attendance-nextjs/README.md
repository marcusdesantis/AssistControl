# AssistControl — Sistema de Gestión de Asistencia

Plataforma SaaS multi-tenant para el control de asistencia de empleados. Compuesta por tres proyectos independientes: backend de microservicios, dashboard web y app móvil.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────┐
│                  Clientes                        │
│  Dashboard Web (React)   App Móvil (Expo/RN)    │
└─────────────────┬───────────────┬───────────────┘
                  │               │
          ┌───────▼───────────────▼───────┐
          │        Nginx (puerto 80)       │
          │     Gateway · CORS · Routing   │
          └───────────────┬───────────────┘
                          │
     ┌────────────────────┼────────────────────┐
     │                    │                    │
  svc-core            svc-employees      svc-attendance
  :3001               :3002              :3003
  Auth / Empresa      Empleados          Asistencia
  Notificaciones      Depto / Cargos     Horarios
     │                    │                    │
  svc-analytics       svc-mobile         svc-comms
  :3004               :3005              :3006
  Dashboard           API Móvil          Mensajes
  Reportes            Checker            Comunicados
     │                    │                    │
  svc-billing         svc-admin
  :3007               :3008
  Facturación         Superadmin
  Suscripciones       Gestión Planes
          │
  ┌───────▼───────┐
  │  PostgreSQL   │
  │  :5432        │
  └───────────────┘
```

---

## Proyectos

### 1. `attendance-nextjs` — Backend (Microservicios)

Backend monorepo con 8 microservicios Next.js 15 detrás de un gateway Nginx.

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

**Variables de entorno (`.env`):**
```env
DATABASE_URL=postgresql://postgres:PASSWORD@host:5432/attendance
JWT_SECRET=secreto_largo_aleatorio
JWT_EXPIRES_IN=1440m
SUPERADMIN_JWT_SECRET=otro_secreto_largo
NGINX_PORT=80
APP_URL=https://tu-dominio.com
FRONTEND_URL=https://tu-dominio.com
PAYPHONE_TOKEN=
PAYPHONE_STORE_ID=
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
POSTGRES_DB=attendance
```

**Cómo ejecutar (local):**
```bash
# 1. Levantar postgres (contenedor separado)
docker run -d --name postgres-assistcontrol \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=attendance \
  -e POSTGRES_HOST_AUTH_METHOD=md5 \
  -p 5433:5432 postgres:16-alpine

# 2. Instalar dependencias
pnpm install

# 3. Crear esquema y datos iniciales
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/attendance" \
  npx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/attendance" \
  npx tsx packages/shared/prisma/seed.ts

# 4. Levantar servicios
docker compose up -d
```

**Cómo ejecutar (producción):**
```bash
git pull
docker compose up -d --build
```

**Migraciones en producción:**
```bash
DATABASE_URL='postgresql://user:pass@localhost:5432/attendance' \
  npx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma
```

**Credenciales iniciales (seed):**
- Superadmin: `superadmin@assistcontrol.com` / `SuperAdmin123!`
- Admin demo: `admin@demo.com` / `Admin123!`
- Empleado demo: `emp001` / `Pass1234!` · PIN: `1234`

**Documentación API:** `http://localhost:80/docs`

---

### 2. `attendance-frontend` — Dashboard Web

Panel de administración para empresas, supervisores y empleados.

**Stack:**
- React 18 · Vite · TypeScript · Tailwind CSS
- Zustand · React Query · React Hook Form · Zod
- Axios · React Router v6 · Lucide Icons

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
| Superadmin | Gestión de tenants, planes, suscripciones, facturas |

**Variables de entorno (`.env`):**
```env
VITE_API_URL=http://localhost:80
```

**Cómo ejecutar:**
```bash
npm install
npm run dev        # Desarrollo — http://localhost:5173
npm run build      # Build producción
npm run preview    # Preview del build
```

---

### 3. `attendance-mobile` — App Móvil

App para empleados — marcación de entrada/salida con GPS.

**Stack:**
- Expo 52 · React Native 0.76 · TypeScript
- Expo Router · Zustand · Axios
- Expo Location · Expo Notifications · Expo Secure Store

**Pantallas:**

| Pantalla | Descripción |
|---|---|
| Login | Acceso con usuario/PIN o checker |
| Inicio | Botones de entrada y salida con GPS |
| Historial | Asistencia mensual, horas trabajadas |
| Perfil | Datos del empleado, cerrar sesión |
| Notificaciones | Avisos del sistema |

**Variables de entorno:**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.X:80
```

> La IP debe ser la del servidor accesible desde el dispositivo móvil.

**Cómo ejecutar:**
```bash
npm install
npm start          # Abre Expo Go (escanear QR)
npm run android    # Emulador Android
npm run ios        # Simulador iOS
```

**Generar APK (Android):**
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

**Configuración (`app.json`):**
- Nombre: `AssistControl`
- Bundle ID (iOS): `com.abisoft.assistcontrol`
- Package (Android): `com.abisoft.assistcontrol`

---

## Despliegue en producción (VPS)

### Requisitos del servidor
- Ubuntu 22.04+
- Docker + Docker Compose
- PostgreSQL 16 instalado en el host
- Puerto 80 abierto

### Instalación inicial
```bash
# 1. Clonar el repositorio
git clone https://github.com/marcusdesantis/AssistControl.git
cd AssistControl

# 2. Configurar variables de entorno
cp .env.example .env
nano .env   # Editar con valores reales

# 3. Configurar PostgreSQL (ya instalado en host)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'tu_password';"
sudo -u postgres psql -c "CREATE DATABASE attendance;"

# 4. Crear esquema y seed
DATABASE_URL='postgresql://postgres:tu_password@localhost:5432/attendance' \
  npx prisma@5.22.0 db push --schema=packages/shared/prisma/schema.prisma

DATABASE_URL='postgresql://postgres:tu_password@localhost:5432/attendance' \
  npx tsx packages/shared/prisma/seed.ts

# 5. Levantar servicios
docker compose up -d
```

### Actualizar el servidor
```bash
git pull
docker compose up -d --build svc-core svc-employees   # Solo los servicios modificados
```

---

## Backup de base de datos

Se recomienda configurar un backup diario automático:

```bash
# Crear script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
pg_dump -U postgres attendance > ~/backups/attendance_$(date +%Y%m%d_%H%M%S).sql
ls -t ~/backups/attendance_*.sql | tail -n +8 | xargs rm -f 2>/dev/null
EOF
chmod +x ~/backup-db.sh

# Cron diario a las 2am
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-db.sh") | crontab -
```

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
