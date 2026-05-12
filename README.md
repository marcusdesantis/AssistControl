# TiempoYa — Sistema de Gestión de Asistencia

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
| `attendance-nextjs-svc-attendance-1` | interno 3003 | Asistencia, horarios, feriados |
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
- JWT · Zod · Nodemailer · Payphone · Nager.Date (API feriados)

**Servicios:**

| Servicio | Puerto | Responsabilidad |
|---|---|---|
| svc-core | 3001 | Auth, empresa, ajustes, notificaciones |
| svc-employees | 3002 | Empleados, departamentos, cargos |
| svc-attendance | 3003 | Asistencia, horarios, feriados |
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

**Funcionalidades destacadas:**

| Funcionalidad | Descripción |
|---|---|
| Verificación de email | Al registrarse desde `/sign-up`, se envía un correo con enlace de verificación (UUID, 24 h). Solo bloquea si SMTP está configurado. Tenants creados por superadmin no requieren verificación. |
| Aprobación manual | Si `requireApproval=true` en SystemSettings, el tenant queda `pendingApproval=true` hasta que el superadmin lo apruebe desde el panel. |
| Horas extras (Art. 55 EC) | Cálculo automático de recargos: nocturno 25 % (19:00–06:00), suplementario 50 % (después del horario, antes de medianoche), suplementario nocturno 100 % (después de medianoche) y extraordinario 100 % (sábados, domingos y feriados). |
| Feriados | CRUD de días inhábiles por tenant. Importación masiva automática desde la API pública Nager.Date (Ecuador). |
| Tipos de horario | Fixed (fijo), Variable (horas mínimas sin horario fijo), Rotativo (turnos rotativos con semanas configurables). |

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
| Horarios | Creación y asignación de horarios (Fixed, Variable, Rotativo) |
| Feriados | Gestión de días inhábiles; importación desde Nager.Date (Ecuador) |
| Asistencia | Registros, marcación manual, exportación |
| Mensajes | Comunicación interna |
| Reportes | General, Ausencias, Tardanzas, Salidas anticipadas, **Horas extras** (Art.55 Ecuador) |
| Empresa | Perfil, configuración SMTP |
| Suscripción | Planes, pagos Payphone, facturas |
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

App para empleados — marcación de entrada/salida con GPS y notificaciones push.

**Stack:**
- Expo 52 · React Native 0.76 · TypeScript
- Expo Router · Zustand · Axios
- Expo Location · Expo Notifications · Expo Secure Store
- EAS Build (Expo Application Services) para compilación en la nube

**Datos de la app:**
- Nombre: `TiempoYa`
- Package Android: `com.abisoft.tiempoya`
- Bundle iOS: `com.abisoft.tiempoya`
- EAS Project ID: `03665f3e-8e79-489e-9984-5480c7486d79`
- EAS Owner: `yasmani1997`
- Icono: `icon.png` (reloj sin texto, 1024×1024, fondo `#0f172a`)
- Splash: `splash.png` (portrait, resizeMode: cover, fondo `#0f172a`)

**Pantallas:**

| Pantalla | Descripción |
|---|---|
| Login | Acceso con usuario/contraseña |
| Inicio | Botones entrada/salida con GPS |
| Historial | Asistencia mensual, horas trabajadas |
| Perfil | Datos del empleado, cerrar sesión |
| Notificaciones | Avisos del sistema |

---

**Cómo ejecutar en desarrollo:**
```bash
cd attendance-mobile
npm install
npm start          # Expo Go (escanear QR)
npm run android    # Emulador Android (sin notificaciones push)
npm run ios        # Simulador iOS (sin notificaciones push)
```

> Las notificaciones push **solo funcionan en APKs generadas con EAS Build**. El emulador y Expo Go no reciben tokens FCM válidos.

---

**Variables de entorno:**

El archivo `.env` local se usa solo para desarrollo. Para los builds de EAS, las variables se configuran en el proyecto de Expo:

```env
# attendance-mobile/.env  (solo para desarrollo local)
EXPO_PUBLIC_API_URL=https://www.tiempoya.net
```

Las variables de producción están configuradas en EAS (proyecto `@yasmani1997/attendance-mobile`):
- `EXPO_PUBLIC_API_URL` = `https://www.tiempoya.net` → perfil `preview`

Para agregar o modificar variables en EAS:
```bash
cd attendance-mobile
eas env:create --scope project --environment preview --name EXPO_PUBLIC_API_URL --value "https://www.tiempoya.net" --visibility plaintext
```

---

**Generar APK (distribución interna / testing) — EAS Build:**

```bash
cd attendance-mobile
npm install

# Iniciar sesión en EAS (solo la primera vez)
eas login   # cuenta: yasmani1997

# Generar APK interna (perfil preview)
eas build --platform android --profile preview --non-interactive
```

EAS compila en la nube (~5 min). Al terminar imprime un link para descargar e instalar el APK directamente en el dispositivo. El APK incluye credenciales FCM para notificaciones push.

**Instalar en el teléfono:** abrir el link de EAS en el navegador del dispositivo Android, o escanear el QR que aparece en la terminal.

> ⚠️ Si el teléfono ya tiene instalada una versión anterior, desinstalarla primero.

---

**Generar AAB para Play Store (producción):**

```bash
eas build --platform android --profile production
```

Genera un `.aab` (Android App Bundle) firmado. Para subirlo a Google Play:
```bash
eas submit --platform android
```
Requiere tener la app creada previamente en [Google Play Console](https://play.google.com/console) y una cuenta de desarrollador ($25 pago único).

---

**Generar build para App Store (iOS):**

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Requiere cuenta Apple Developer ($99/año) y la app creada en App Store Connect. EAS compila en workers con Mac, no se necesita hardware Apple.

---

**Perfiles de EAS (`eas.json`):**

| Perfil | Tipo | Uso |
|---|---|---|
| `preview` | APK interno | Testing en dispositivos físicos |
| `production` | AAB firmado | Publicación en tiendas |
| `development` | Dev client | Desarrollo con módulos nativos |

---

**Notificaciones push:**

Las notificaciones push requieren Firebase (FCM v1). Ya está configurado en el proyecto:

- **Firebase project:** `tiempoya-c8cb9` (cuenta `yasmani1997@gmail.com`)
- **`google-services.json`:** almacenado como variable secreta `GOOGLE_SERVICES_JSON` en EAS (perfil `preview`). EAS lo inyecta automáticamente durante el build — no se sube al repo.
- **Credencial FCM v1:** subida a EAS credentials (Android app credentials ID `67585bb5-8cb1-4e56-958b-07cad5ecfeeb`).
- **`app.config.js`:** lee `process.env.GOOGLE_SERVICES_JSON` en tiempo de build para que expo prebuild encuentre el archivo.

Si hay que reconfigurar Firebase en un nuevo proyecto:
1. Crear proyecto en [console.firebase.google.com](https://console.firebase.google.com/)
2. Registrar app Android con package `com.abisoft.tiempoya` → descargar `google-services.json`
3. Project Settings → Service accounts → Generar nueva clave privada (archivo `adminsdk-xxx.json`)
4. Subir `google-services.json` como variable de entorno EAS:
   ```bash
   eas env:create --scope project --environment preview --name GOOGLE_SERVICES_JSON --value <ruta-al-archivo> --type file --visibility secret
   ```
5. Subir credencial FCM v1 a EAS via API (ver script `upload_fcm.js` en historial de conversación) o con `eas credentials --platform android`
6. Rebuildelar APK

**Plataformas soportadas:**

| Plataforma | Estado | Notas |
|---|---|---|
| Android | ✅ Funcional | FCM v1 configurado en EAS |
| iOS | ⏳ Pendiente | Requiere cuenta Apple Developer ($99/año) y credenciales APNs |

Para habilitar iOS en el futuro:
1. Adquirir cuenta [Apple Developer](https://developer.apple.com/)
2. Registrar app `com.abisoft.tiempoya` en App Store Connect
3. Configurar APNs: `eas credentials --platform ios`
4. Build: `eas build --platform ios --profile preview`

El backend (`sendExpoPush`) ya está preparado para iOS — Expo Push Service gestiona tanto FCM (Android) como APNs (iOS) con la misma API. Solo falta el build con credenciales Apple.

---

**Tipos de notificación implementados:**

| Tipo | Formato | Condición de envío |
|---|---|---|
| 📢 Mensaje de empresa | `📢 NombreEmpresa` / asunto | Cuando el admin envía mensaje a empleado(s) |
| ⏰ Recordatorio entrada | `⏰ Entrada en 5 minutos` | 5 min antes de `entryTime`, sin check-in hoy |
| 🍽 Recordatorio almuerzo | `🍽 Almuerzo en 5 minutos` | 5 min antes de `lunchStart`, con check-in activo |
| 🔔 Recordatorio regreso | `🔔 Regreso en 5 minutos` | 5 min antes de `lunchEnd`, sin check-in post-almuerzo |
| 🏁 Recordatorio salida | `🏁 Salida en 5 minutos` | 5 min antes de `exitTime`, con check-in activo |

Los recordatorios solo se envían a empleados de tenants con plan que incluya `mobileApp.enabled = true`. El cron corre cada minuto en `svc-mobile` vía `instrumentation.ts`.

> **Nota:** Los registros de check-in/checkout desde la app **no generan push** — el usuario ya ve la confirmación en pantalla. El recordatorio de entrada no llega si el empleado ya tiene check-in hoy (comportamiento correcto).

---

**Fixes permanentes ya integrados en el proyecto:**

Los siguientes problemas ya están resueltos y no requieren pasos manuales en futuros builds:

1. **Kotlin 1.9.24 vs 1.9.25** — El plugin `plugins/withKotlinVersion.js` + `expo-build-properties` fuerzan Kotlin 1.9.25 durante el prebuild de EAS, necesario para que el Compose Compiler 1.5.15 (usado por `expo-modules-core`) compile correctamente. Sin este fix el build falla con `compileReleaseKotlin FAILED`.

2. **`google-services.json` no rastreado por git** — Se usa `app.config.js` con `process.env.GOOGLE_SERVICES_JSON` para que expo prebuild resuelva el path en tiempo de build. No se puede usar `app.json` directamente porque no expande variables de entorno en ese campo.

3. **Tráfico HTTP (cleartext)** — `android:usesCleartextTraffic="true"` se aplica automáticamente en `AndroidManifest.xml` vía el plugin, permitiendo conexiones HTTP en desarrollo.

---

**Solución de problemas frecuentes:**

| Problema | Causa | Solución |
|---|---|---|
| `compileReleaseKotlin FAILED` | Compose Compiler necesita Kotlin 1.9.25 | Ya resuelto con `withKotlinVersion.js` |
| `Default FirebaseApp is not initialized` | `google-services.json` no incluido en el build | Verificar variable `GOOGLE_SERVICES_JSON` en EAS y `app.config.js` |
| NetworkError al abrir la app | `EXPO_PUBLIC_API_URL` no configurada en EAS | `eas env:create --scope project --environment preview --name EXPO_PUBLIC_API_URL ...` |
| Token push null en DB | Permisos denegados o app no abre sesión | Ajustes → Apps → TiempoYa → Notificaciones → Activar; volver a iniciar sesión |
| APK instalado pero sin notificaciones push | APK sin credenciales FCM (build local) | Usar `eas build` en lugar de Gradle local |
| Recordatorio de entrada no llega | Empleado ya tiene check-in hoy | Comportamiento correcto — probar con recordatorio de salida |
| Recordatorio nunca llega | Plan del tenant sin `mobileApp.enabled=true` | Activar en superadmin → Plan → capabilities |

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

Jenkins accesible en: `https://ci.tiempoya.net` (también `http://167.86.87.213:9090`)

### Estado de la configuración

| Fase | Descripción | Estado |
|---|---|---|
| Fase 1 | Instalar Jenkins en el servidor | ✅ Completado |
| Fase 2 | Instalar plugins (GitHub Integration + SSH Agent) | ✅ Completado |
| Fase 3 | Credenciales en Jenkins (DATABASE_URL + github-ssh) | ✅ Completado |
| Fase 4 | Crear Jenkinsfile en la raíz del repo | ✅ Completado |
| Fase 5 | Crear Job `tiempoya-deploy` en Jenkins | ✅ Completado |
| Fase 5b | Subdominio `ci.tiempoya.net` con SSL | ✅ Completado |
| Fase 6 | Deploy key agregado en GitHub | ✅ Completado |
| Fase 7 | Configurar Job Pipeline con repo GitHub | ⏳ Pendiente — falta vincular repo en el Job |
| Fase 8 | Configurar Webhook en GitHub | ⏳ Pendiente — dueño del repo debe agregarlo |
| Fase 9 | Probar el pipeline completo | ⏳ Pendiente |

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

**Fase 7 — Vincular repo en el Job** (pendiente):
- Jenkins → `tiempoya-deploy` → Configure → Pipeline
- Definition: `Pipeline script from SCM`
- SCM: `Git`
- Repository URL: `git@github.com:marcusdesantis/AssistControl.git`
- Credentials: `github-ssh`
- Branch: `*/main`
- Script Path: `Jenkinsfile`
- Guardar

**Fase 8 — Webhook en GitHub** (el dueño del repo debe hacerlo):
- GitHub → repo → Settings → Webhooks → Add webhook
- Payload URL: `https://ci.tiempoya.net/github-webhook/`
- Content type: `application/json`
- SSL verification: Enable SSL verification
- Trigger: `Just the push event`
- Active: ✅

**Fase 9 — Probar el pipeline**:
- Jenkins → Job `tiempoya-deploy` → Build Now
- Verificar que los 4 stages pasen en verde: Pull → Migrar DB → Deploy Backend → Deploy Frontend

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
