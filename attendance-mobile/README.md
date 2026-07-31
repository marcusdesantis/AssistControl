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

### 3. react-native-reanimated en ruta corta — ya no hace falta

> **Obsoleto desde Expo SDK 54.** Reanimated 4 reorganizó sus fuentes C++ y el
> junction a `C:\rn` dejó de ser necesario. Peor: al actualizar quedaba
> apuntando a la versión vieja (3.17.5) y Gradle veía el módulo nativo
> duplicado. `react-native.config.js` ya no lleva el override.
>
> Si un build local vuelve a fallar por rutas largas, confirmar primero que el
> paso 1 (`LongPathsEnabled`) esté aplicado.

---

## Firma de release (keystore)

> ⚠️ **`credentials/tiempoya-release.keystore` es irreemplazable.** Firma el
> package `com.abisoft.tiempoya`. Si se pierde, Google Play no vuelve a aceptar
> una actualización de la app: habría que publicarla como app nueva y perder a
> todos los usuarios. La carpeta `credentials/` está gitignorada, así que **no
> hay copia en el repositorio** — mantén un respaldo externo (gestor de
> contraseñas o disco cifrado).

La firma se aplica sola en cada `prebuild` mediante `plugins/withReleaseSigning.js`,
que inyecta el `signingConfigs.release` en `android/app/build.gradle` y las
propiedades en `android/gradle.properties`.

Las credenciales viven en `credentials/signing.json` (gitignorado):

```json
{
  "KEYSTORE_FILE": "../../credentials/tiempoya-release.keystore",
  "KEYSTORE_PASSWORD": "...",
  "KEY_ALIAS": "tiempoya",
  "KEY_PASSWORD": "..."
}
```

Tanto el keystore como las credenciales están **fuera de `android/`** a propósito:
`expo prebuild --clean` borra esa carpeta entera, y antes se llevaba por delante
el keystore y las contraseñas.

Si `signing.json` no existe, el build no falla — firma con `debug.keystore`,
que sirve para pruebas pero **Play Store lo rechaza**.

---

## Versionado

### Versión actual: **1.2.0 (versionCode 9)**

| Fecha | versionName | versionCode | Contenido |
|---|---|---|---|
| 2026-07-28 | **1.2.0** | **9** | Expo SDK 54 · RN 0.81 · targetSdk 36 (Android 16) · edge-to-edge e insets corregidos · botón de marcaje bloqueado durante la carga |
| — | 1.1.0 | 8 | Versión anterior en Play Store |

Ambos valores viven en `app.json`. Antes `versionCode` estaba solo en
`android/app/build.gradle`, y `prebuild --clean` lo reseteaba a 1 — Play Store
rechaza cualquier AAB con un `versionCode` menor o igual al ya publicado.

```json
"version": "1.2.0",                 // versionName
"android": { "versionCode": 9 }     // +1 en cada subida a Play Store
```

> **Se suben solo en el momento de generar el `.aab`**, no antes. Trabajar en
> `main` con la versión ya publicada evita confundir qué está en la tienda.

**Al generar un `.aab` nuevo, siempre:**

1. Subir `versionCode` (+1) y `version` en `app.json`.
2. `npx expo prebuild --platform android` (sin `--clean`, para conservar la caché nativa).
3. `cd android && ./gradlew bundleRelease`
4. **Actualizar la tabla de arriba con la versión nueva** — es la referencia de qué hay publicado.

No editar `android/app/build.gradle` a mano: se regenera en cada prebuild.

---

## Android 16 (API 36) y edge-to-edge

Migrado de Expo SDK 53 a **SDK 54 · RN 0.81 · targetSdk 36** para cumplir la
política de Google Play (obligatoria desde el 30 ago 2026).

Android 16 eliminó el opt-out de edge-to-edge, así que la app se dibuja siempre
bajo las barras del sistema. Lo que eso implicó:

- `SafeAreaProvider` en `app/_layout.tsx` — **faltaba**, y sin él los insets
  llegan en cero de forma intermitente (por eso el menú se tapaba "a veces").
- Tab bar con `height: 62 + insets.bottom` en vez de altura fija.
- `statusBarTranslucent` + `navigationBarTranslucent` en todos los `<Modal>`.
- `plugins/withEdgeToEdgeStyles.js` quita `android:statusBarColor` del tema
  (obsoleto en API 35+) y fuerza iconos claros en las barras.

Al tocar cualquier pantalla, verificar que el contenido no quede bajo la barra
de estado ni bajo la de navegación.

> El aviso de Play Console sobre **APIs obsoletas de borde a borde** seguirá
> apareciendo: las llamadas están dentro de `react-native` y
> `react-native-screens`, que las mantienen para Android 10–14. Es una
> advertencia, no un bloqueo.

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
