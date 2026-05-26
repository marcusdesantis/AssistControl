# TiempoYa — App Móvil (React Native / Expo)

## Requisitos de la máquina de build (configuración única)

Estos pasos se hacen **una sola vez** en cada máquina nueva.

### 1. Habilitar paths largos en Windows (requiere admin)

```powershell
# Abrir PowerShell como Administrador
reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
```

### 2. Actualizar Ninja en el Android SDK

CMake 3.22.1 incluye Ninja 1.10 que tiene un límite interno de 260 caracteres. Reemplazarlo con Ninja 1.12+:

```powershell
Invoke-WebRequest -Uri "https://github.com/ninja-build/ninja/releases/download/v1.12.1/ninja-win.zip" `
    -OutFile "$env:TEMP\ninja-win.zip" -UseBasicParsing
Expand-Archive "$env:TEMP\ninja-win.zip" -DestinationPath "$env:TEMP\ninja_new" -Force
Copy-Item "$env:TEMP\ninja_new\ninja.exe" `
    "$env:LOCALAPPDATA\Android\Sdk\cmake\3.22.1\bin\ninja.exe" -Force
```

### 3. Mover react-native-reanimated a ruta corta

react-native-reanimated tiene fuentes C++ en rutas profundas que exceden el límite de Windows. Ejecutar desde la raíz del proyecto:

```powershell
$mobile = (Get-Location).Path
$rnrSrc = "$mobile\node_modules\react-native-reanimated"

robocopy $rnrSrc "C:\rn" /E /NFL /NDL /NJH /NJS /R:0 /W:0
New-Item -ItemType Junction -Path "C:\rn\node_modules" -Target "$mobile\node_modules" | Out-Null

New-Item -ItemType Directory -Force "C:\mt" | Out-Null
robocopy "C:\mt" $rnrSrc /MIR /NFL /NDL /NJH /NJS /R:0 /W:0 | Out-Null
[System.IO.Directory]::Delete($rnrSrc)
[System.IO.Directory]::Delete("C:\mt")
New-Item -ItemType Junction -Path $rnrSrc -Target "C:\rn" | Out-Null
```

> El archivo `react-native.config.js` ya está en el repo con la configuración necesaria.

---

## Actualizar versión antes de cada release

En `android/app/build.gradle`:
```groovy
versionCode 9        // +1 en cada subida al Play Store
versionName "1.2.0"
```

En `app.json`:
```json
"version": "1.2.0"
```

---

## Generar APK de prueba

```powershell
cd android
.\gradlew assembleRelease
```

APK en: `android/app/build/outputs/apk/release/app-release.apk`

## Generar AAB para Play Store

```powershell
cd android
.\gradlew bundleRelease
```

AAB en: `android/app/build/outputs/bundle/release/app-release.aab`

Subir en Play Console → Producción → Crear nueva versión.

---

## Generar APK Release (legacy)

### ⚠️ Cuando los cambios no aparecen en el APK

Gradle y Metro cachean el bundle JS. Si después de modificar código el APK no refleja los cambios, borrar las carpetas de salida del bundle **antes** de compilar:

```powershell
# PowerShell — ejecutar desde la raíz del proyecto
$base = "android\app\build"
Remove-Item "$base\intermediates\assets"    -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$base\generated\assets"        -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$base\outputs\apk"             -Recurse -Force -ErrorAction SilentlyContinue

cd android
.\gradlew assembleRelease
```

Esto fuerza a Metro a regenerar el bundle desde cero sin recompilar el código nativo (que sí queda cacheado). El build tarda ~5 minutos.

> **Importante:** NO usar `clean` ni `--rerun-tasks` — recompilan las librerías C++ nativas y fallan con `mergeDexRelease`.

### Instalar en el dispositivo

Siempre **desinstalar la app primero** antes de instalar el nuevo APK, para evitar que Android use la versión anterior cacheada.

---

## Estructura

```
app/
  (auth)/index.tsx     — Login: 3 métodos (Usuario / Huella/Face ID / PIN)
  (app)/
    index.tsx          — Pantalla principal (registro entrada/salida)
    profile.tsx        — Perfil (biométrico + PIN setup)
    history.tsx        — Historial de asistencia
    notifications.tsx  — Notificaciones

src/
  services/
    biometricService.ts  — Face ID / huella digital
    mobileService.ts     — API calls al backend
  store/
    authStore.ts         — Estado de sesión (Zustand)
  utils/
    storage.ts           — SecureStore wrapper
    notifications.ts     — Push notifications (Expo)
```
