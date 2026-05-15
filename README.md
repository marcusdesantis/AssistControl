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
- Superadmin: `superadmin@tiempoya.net` / `SuperAdmin123!`
- Admin demo: usuario `admin` / `Admin123!`
- Empleado demo: código `EMP-001` / `Pass1234!` · PIN: `1234`

**Documentación API:** `https://www.tiempoya.net/docs`

**Funcionalidades destacadas:**

| Funcionalidad | Descripción |
|---|---|
| Verificación de email | Al registrarse desde `/sign-up`, se envía un correo con enlace de verificación (UUID, 24 h). Solo bloquea si SMTP está configurado. Tenants creados por superadmin no requieren verificación. |
| Aprobación manual | Si `requireApproval=true` en SystemSettings, el tenant queda `pendingApproval=true` hasta que el superadmin lo apruebe desde el panel. |
| Horas extras (Art. 55 EC) | Cálculo automático de recargos: nocturno 25 % (19:00–06:00), suplementario 50 % (después del horario, antes de medianoche), suplementario nocturno 100 % (después de medianoche) y extraordinario 100 % (sábados, domingos y feriados). |
| Feriados | CRUD de días inhábiles por tenant. Importación masiva automática desde la API pública Nager.Date (Ecuador). |
| Tipos de horario | Fixed (fijo), Variable (horas mínimas sin horario fijo), Rotativo (turnos rotativos con semanas configurables). |

---

### 2. `attendance-frontend` — Dashboard Web + App Admin (Android)

Panel de administración para empresas, supervisores y empleados. Se sirve como contenedor Docker en el puerto 80 (web) y también como APK Android vía Capacitor (para administradores en móvil).

**Stack:**
- React 18 · Vite 4 · TypeScript · Tailwind CSS
- Zustand · React Query · React Hook Form · Zod · Axios · React Router v6
- **Capacitor 6** (Android/iOS) — empaqueta la SPA como app nativa
- jsPDF · xlsx-js-style · html2canvas (reportes exportables)
- Capacitor plugins: App · Filesystem · Share · SplashScreen

**Datos de la app (Capacitor):**
- App ID: `com.abisoft.tiempoya.admin`
- Nombre: `TiempoYa Admin`
- Android: carpeta `android/` generada con `npx cap add android`

**Módulos principales:**

| Módulo | Descripción |
|---|---|
| Dashboard | KPIs, resumen de asistencia del día |
| Empleados | CRUD completo, importación masiva |
| Organización | Departamentos y cargos |
| Horarios | Creación y asignación (Fixed, Variable, Rotativo) |
| Feriados | Gestión de días inhábiles; importación desde Nager.Date |
| Asistencia | Registros, marcación manual, exportación |
| Mensajes | Comunicación interna con notificación push |
| Reportes | General, Ausencias, Tardanzas, Salidas anticipadas, Horas extras — exportables a **PDF y Excel** |
| Empresa | Perfil, configuración SMTP |
| Suscripción | Planes, pagos Payphone, facturas |
| Checker | Estación de marcación por PIN/QR |
| Soporte | Tickets con chat en tiempo real (SSE) |
| Superadmin `/sys` | Gestión de tenants, planes, suscripciones, facturas |
| Perfil | Datos de usuario, cambio de contraseña |

**Variables de entorno:**
```env
# .env  (web local)
VITE_API_URL=http://localhost:80

# .env.mobile  (build APK — apunta a producción)
VITE_API_URL=https://www.tiempoya.net
```

---

**Cómo ejecutar en desarrollo (web):**
```bash
cd attendance-frontend
npm install
npm run dev        # http://localhost:5173
```

**Actualizar en producción** (contenedor independiente, NO usa docker-compose):
```bash
cd ~/proyectos/opt/attendance-ia/attendance-frontend
git pull
docker build --add-host=host.docker.internal:host-gateway -t aiattendance-frontend .
docker stop aiattendance-frontend && docker rm aiattendance-frontend
docker run -d --name aiattendance-frontend --add-host=host.docker.internal:host-gateway -p 80:80 aiattendance-frontend
```

> **Importante:** `--add-host=host.docker.internal:host-gateway` es obligatorio para que nginx pueda hacer proxy al backend en el puerto 8080.

**nginx del frontend** (`attendance-frontend/nginx.conf`):
- `/` · `/precios` · `/_next/` → proxy a `host.docker.internal:8080` (svc-landing)
- `/api/v1/` → proxy a `host.docker.internal:8080` (microservicios)
- resto → SPA `index.html`

---

**Generar APK Android (Capacitor):**

La carpeta `android/` ya existe en el repo y está configurada.

**Requisitos para compilar:**

| Herramienta | Versión | Notas |
|---|---|---|
| Java JDK | **21** | `bcprov-jdk18on 1.79` (dep. de google-services/Firebase) tiene clases Java 21 — versiones anteriores fallan |
| Gradle | **8.7** | Gradle < 8.5 no puede procesar multi-release JARs con clases Java 21 |
| Android SDK | API 33+ | `compileSdkVersion` en `android/variables.gradle` |
| AGP | 8.2.1 | Android Gradle Plugin en `android/build.gradle` |

Instalar Java 21 si no está:
```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

El `android/gradle.properties` ya tiene `org.gradle.java.home` apuntando a Eclipse Temurin 21 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`). Si instalaste en otra ruta, actualiza ese valor.

**Build APK release:**
```powershell
cd attendance-frontend

# 1. Build web + sincronizar Capacitor
npm run build:mobile
# Equivale a: vite build --mode mobile && npx cap sync

# 2. Compilar APK debug (firmado automáticamente, listo para instalar)
cd android
.\gradlew.bat assembleDebug
# APK en: android\app\build\outputs\apk\debug\app-debug.apk
```

> El APK `release-unsigned` **no se puede instalar** — Android rechaza APKs sin firma.
> Para distribución interna usa siempre `assembleDebug`. Para Play Store se necesita un keystore de firma.

**Si el JS no se actualiza en el APK** (Gradle marca bundle como UP-TO-DATE):
```powershell
$base = "android\app\build"
Remove-Item "$base\intermediates\assets" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$base\generated\assets"    -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$base\outputs\apk"         -Recurse -Force -ErrorAction SilentlyContinue
cd android
.\gradlew.bat assembleDebug
```
> No usar `gradlew clean` — rompe la compilación nativa (`mergeDexRelease FAILED`).

Instalar vía USB (modo depuración USB activado en el teléfono):
```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

O copiar el `.apk` al teléfono e instalar manualmente (`Ajustes → Instalar apps desconocidas`).

---

**Características específicas para Android:**

| Feature | Descripción |
|---|---|
| Botón Atrás nativo | `useAndroidBack.ts` — navega atrás o sale con doble click |
| SplashScreen | Fondo azul `#1e40af`, 2 segundos, se oculta al montar React |
| Exportar PDF | `html2canvas` + `jsPDF` → `Filesystem.writeFile` + `Share.share` vía `@capacitor/share` |
| Exportar Excel | `xlsx-js-style` → `Filesystem.writeFile` + `Share.share` vía `@capacitor/share` |
| Descargar comprobante | HTML del backend → `jsPDF` (con márgenes A4, multi-página) → `Share.share` |
| Detección plataforma | `src/utils/platform.ts`: `isNative`, `isAndroid`, `isIOS` |
| Checador responsive | `CheckerPage.tsx` — vista separada en mobile (formulario / registros), cards en lugar de tabla, botón volver al dashboard |

**Estado actual:**
- ✅ Web: funcionando en producción (Docker puerto 80)
- ✅ Android APK: generado con `gradlew.bat assembleDebug` (Java 21 + Gradle 8.7) — apunta a `https://www.tiempoya.net`
- ✅ Reportes PDF/Excel exportables desde mobile vía Share nativo
- ✅ Comprobantes de pago descargables como PDF con márgenes A4
- ✅ Checador adaptado para uso en tablet/móvil
- ⏳ iOS: requiere cuenta Apple Developer ($99/año) + `npx cap add ios`

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

## Dominio y SSL

El dominio `tiempoya.net` no está adquirido aún, pero toda la infraestructura ya está preparada para cuando se adquiera:

- `APP_URL=https://www.tiempoya.net` ya está configurada en el backend
- `sitemap.xml`, `robots.txt` y los canonicals apuntan a `https://www.tiempoya.net`
- Las 3 landing pages de conversión y la landing principal ya tienen SEO completo

Cuando se adquiera el dominio:
1. Apuntar DNS `A` a `167.86.87.213`
2. Instalar Certbot y configurar SSL en nginx
3. Verificar el sitio en Google Search Console y enviar `sitemap.xml`
4. Solicitar indexación de las 5 URLs principales en GSC

---

## SEO — `svc-landing`

Las páginas públicas tienen SEO técnico implementado:

| Archivo | Ubicación | Descripción |
|---|---|---|
| `sitemap.xml` | `svc-landing/public/` | 5 URLs: `/`, `/precios`, 3 landings |
| `robots.txt` | `svc-landing/public/` | Allow all + Sitemap declarado |
| `og-image.png` | `svc-landing/public/` | Imagen Open Graph 1200×630 |

**Páginas de conversión (landing pages):**

| URL | Archivo | Temática |
|---|---|---|
| `/landing/tiempoya-landing1` | `public/empleados.html` | App para empleados — marcar asistencia desde el celular |
| `/landing/tiempoya-landing2` | `public/empresas.html` | Control de asistencia para empresas |
| `/landing/tiempoya-landing3` | `public/productividad.html` | Reducción de costos laborales |

Cada landing tiene: `<title>`, `<meta description>`, canonical, Open Graph, Twitter Cards, JSON-LD (`SoftwareApplication`, `Organization`, `FAQPage`).

**Pendiente (requiere acción manual):**
- Verificar dominio en Google Search Console (DNS TXT verification)
- Enviar `sitemap.xml` en GSC
- Solicitar indexación de las 3 landing pages en GSC

---

## CI/CD — Jenkins (Deploy automático)

Jenkins accesible en: `https://ci.tiempoya.net` (también `http://167.86.87.213:9090`)

> **Estado: ✅ OPERATIVO** — Cada `git push` a `main` dispara el pipeline automáticamente vía webhook de GitHub.

### Estado de la configuración

| Fase | Descripción | Estado |
|---|---|---|
| Fase 1 | Instalar Jenkins en el servidor | ✅ Completado |
| Fase 2 | Instalar plugins (GitHub Integration + SSH Agent) | ✅ Completado |
| Fase 3 | Credenciales en Jenkins (github-ssh) | ✅ Completado |
| Fase 4 | Crear Jenkinsfile en la raíz del repo | ✅ Completado |
| Fase 5 | Crear Job `tiempoya-deploy` en Jenkins | ✅ Completado |
| Fase 5b | Subdominio `ci.tiempoya.net` con SSL | ✅ Completado |
| Fase 6 | Deploy key agregado en GitHub | ✅ Completado |
| Fase 7 | Configurar Job Pipeline con repo GitHub | ✅ Completado |
| Fase 8 | Webhook en GitHub configurado | ✅ Completado |
| Fase 9 | Pipeline probado y funcionando | ✅ Completado — Build #10 exitoso |

### Pipeline (Jenkinsfile)

4 stages que corren en orden:

| Stage | Qué hace |
|---|---|
| **Pull** | `git pull origin main` con clave SSH (`sshagent github-ssh`) |
| **Migrar DB** | `prisma db push` vía `docker run node:20-alpine` con `--add-host=host.docker.internal:host-gateway` |
| **Deploy Backend** | `docker compose down && docker compose up -d --build` en `attendance-nextjs/` |
| **Deploy Frontend** | `docker build` + `docker stop/rm/run` en `attendance-frontend/` |

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

### Dependencias instaladas en el contenedor Jenkins

Estas herramientas fueron instaladas manualmente dentro del contenedor. Si Jenkins se reinicia o se recrea el contenedor, hay que reinstalarlas:

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Docker CLI
apt-get install -y docker.io

# Docker Compose v2
curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
mkdir -p /usr/local/lib/docker/cli-plugins
ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose

# Docker Buildx
curl -fsSL https://github.com/docker/buildx/releases/download/v0.19.3/buildx-v0.19.3.linux-amd64 \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx

# GitHub known_hosts
ssh-keyscan -t ed25519,rsa github.com >> /root/.ssh/known_hosts
```

> **Tip:** Para evitar tener que reinstalar en cada reinicio, se recomienda crear un `Dockerfile` personalizado para Jenkins que incluya todas estas dependencias.

### Credenciales configuradas en Jenkins

| ID | Tipo | Descripción |
|---|---|---|
| `github-ssh` | SSH Username with private key | Clave SSH para acceder al repo de GitHub |

### Clave pública SSH (Deploy key en GitHub)

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGi4x4DSASS50ygxbcW7dDHg0Cg2CEtGmK4bgVJhHkxR jenkins@tiempoya
```

### Webhook de GitHub

- **Payload URL:** `https://ci.tiempoya.net/github-webhook/`
- **Content type:** `application/json`
- **Trigger:** `Just the push event`

---

## Push Notifications — Web (attendance-frontend)

> **Estado: ⚠️ PARCIALMENTE IMPLEMENTADO** — La infraestructura backend está completa y funcional. El envío desde el servidor a FCM responde `OK`. El problema pendiente está en el registro del token en el navegador Chrome (frontend).

### Qué está implementado

**Backend (attendance-nextjs):**

| Componente | Archivo | Estado |
|---|---|---|
| Modelo `DeviceToken` en Prisma | `packages/shared/prisma/schema.prisma` | ✅ Desplegado — `@@unique([token, userType])` |
| Lógica FCM (OAuth2 + HTTP v1 API) | `packages/shared/src/utils/fcm.ts` | ✅ Funcional — `sendToTokens` responde OK |
| `createNotificationWithPush()` | `packages/shared/src/utils/fcm.ts` | ✅ Reemplaza `prisma.notification.create` |
| Endpoint registro token (admin) | `svc-core/api/v1/notifications/push-token` | ✅ PUT con cleanup de tokens anteriores |
| Endpoint registro token (superadmin) | `svc-admin/api/v1/admin/notifications/push-token` | ✅ PUT con cleanup de tokens anteriores |
| Push en: soporte tenant→admin | `svc-support/support.service.ts` | ✅ Usa `createNotificationWithPush` |
| Push en: soporte admin→empresa | `svc-admin/support.service.ts` | ✅ Usa `createNotificationWithPush` |
| Push en: aprobación empresa | `svc-admin/admin.service.ts` | ✅ Usa `createNotificationWithPush` |
| Push en: auth (nueva empresa) | `svc-core/auth.service.ts` | ✅ Usa `createNotificationWithPush` |
| Push en: notificar empresa (superadmin) | `svc-admin/tenants/[id]/notify` | ✅ Usa `createNotificationWithPush` |
| Push en: notificar masivo (superadmin) | `svc-admin/tenants/bulk` | ✅ Usa `createNotificationWithPush` |
| Push en: cambio suscripción | `svc-billing/billing.service.ts` | ✅ Usa `createNotificationWithPush` |
| Migración `prisma-migrate` en compose | `docker-compose.yml` | ✅ Corre antes de todos los servicios |

**Frontend (attendance-frontend):**

| Componente | Archivo | Estado |
|---|---|---|
| Service worker | `public/firebase-messaging-sw.js` | ✅ Con `skipWaiting` + `clients.claim()` |
| Utilidad push web | `src/utils/pushNotifications.ts` | ✅ Con retry en AbortError, cache de token |
| Hook `usePushNotifications` | `src/hooks/usePushNotifications.ts` | ✅ Con logging de errores |
| Integración en Layout admin | `src/components/Layout.tsx` | ✅ |
| Integración en SysLayout superadmin | `src/features/sys/SysLayout.tsx` | ✅ |
| Detección y skip de Brave | `src/utils/pushNotifications.ts` | ✅ Brave bloquea FCM por diseño |
| Variables de entorno Firebase | `pushNotifications.ts` + `firebase-messaging-sw.js` | ✅ Hardcoded como fallback |
| SSE soporte en nginx frontend | `nginx.conf` | ✅ `proxy_buffering off` + 3600s timeout |

### Cómo funciona (cuando funciona)

```
1. Usuario abre app en Chrome
2. navigator.serviceWorker.register('/firebase-messaging-sw.js')
3. navigator.serviceWorker.ready → espera SW activo
4. getToken(messaging, { vapidKey, serviceWorkerRegistration }) → token FCM
5. PUT /api/v1/notifications/push-token → guarda en DeviceToken (borra token anterior)
6. Cuando ocurre evento → createNotificationWithPush() → FCM v1 API → browser
7. SW recibe push → showNotification() muestra la notificación OS
```

### Variables de entorno requeridas en backend (`.env`)

```env
# JSON completo del service account de Firebase en una sola línea
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"tiempoya-admin",...}
```

Obtener en: Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.

### Problema pendiente — token no se registra en Chrome

**Síntoma:** El flujo llega a `getToken()` pero falla con `AbortError: Registration failed - push service error`. El retry (delete token + unsubscribe + re-getToken) tampoco funciona.

**Lo que ya se descartó:**
- ✅ VAPID key correcta (superadmin a veces logra token)
- ✅ Firebase config correcta (fallbacks hardcoded)
- ✅ Service worker existe y activa con `skipWaiting`
- ✅ `FIREBASE_SERVICE_ACCOUNT` configurado en backend
- ✅ DeviceToken table en DB (con `@@unique([token, userType])`)
- ✅ Brave no compatible con FCM (detectado y omitido)
- ✅ FCM envía OK cuando hay token válido en DB

**Hipótesis más probables:**
1. El `navigator.serviceWorker.ready` retorna un SW en estado inconsistente por los muchos builds consecutivos que actualizaron el SW
2. La suscripción push en el navegador quedó en estado inválido tras los múltiples `unsubscribe()` del retry
3. Posible race condition entre el SW que activa con `clients.claim()` y la llamada a `getToken`

**Próximos pasos para resolver:**
1. Probar en Chrome con perfil limpio (sin historial del SW) — `chrome://settings/clearBrowserData`
2. Verificar en DevTools → Application → Service Workers si el SW está en estado `activated`
3. Verificar en DevTools → Application → Push Messaging si existe suscripción push activa
4. Si hay suscripción activa pero `getToken` falla: el VAPID key podría haber rotado en Firebase Console
5. Considerar usar Firebase Admin SDK directamente en el backend en vez del JWT manual para FCM v1

### Compatibilidad de navegadores

| Navegador | Estado | Notas |
|---|---|---|
| Chrome / Chromium | ⚠️ Pendiente fix | Token registration intermitente |
| Brave | ❌ No compatible | Brave bloquea FCM por diseño (privacy shields) |
| Firefox | ⚠️ No probado | Usa Mozilla Push Service, no FCM |
| Safari / iOS | ❌ No compatible | Web Push requiere iOS 16.4+ y config adicional |
| Edge | ⚠️ No probado | Basado en Chromium, debería funcionar |

### Firebase proyecto

- **Proyecto admin (attendance-frontend):** `tiempoya-admin` — cuenta `superadmin@aiattendance.com`
- **Proyecto móvil (attendance-mobile):** `tiempoya-c8cb9` — cuenta `yasmani1997@gmail.com`

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
