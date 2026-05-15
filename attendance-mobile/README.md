# TiempoYa — App Móvil (React Native / Expo)

## Generar APK Release

### Comando estándar
```bash
cd android
.\gradlew.bat assembleRelease
```

APK generado en: `android/app/build/outputs/apk/release/app-release.apk`

### ⚠️ Cuando los cambios no aparecen en el APK

Gradle y Metro cachean el bundle JS. Si después de modificar código el APK no refleja los cambios, borrar las carpetas de salida del bundle **antes** de compilar:

```powershell
# PowerShell — ejecutar desde la raíz del proyecto
$base = "android\app\build"
Remove-Item "$base\intermediates\assets"    -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$base\generated\assets"        -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$base\outputs\apk"             -Recurse -Force -ErrorAction SilentlyContinue

cd android
.\gradlew.bat assembleRelease
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
