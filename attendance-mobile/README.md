# AI Attendance — App Móvil

App móvil para empleados desarrollada con **Expo + React Native + TypeScript**.

## Requisitos previos
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- En iOS: iPhone con la app **Expo Go** instalada
- En Android: Teléfono con la app **Expo Go** instalada

## Configuración

1. Copia el archivo de entorno:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` y pon la IP de tu servidor:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.X:5000
   ```
   > Asegúrate de que el teléfono y la PC estén en la misma red WiFi.

3. Instala dependencias:
   ```bash
   npm install
   ```

4. Arranca el servidor de desarrollo:
   ```bash
   npm start
   ```

5. Escanea el QR con **Expo Go** desde tu teléfono.

## Flujo de la app

1. **Login**: El empleado ingresa la clave del checador (misma de la web), su número y PIN.
2. **Asistencia**: Botón verde para entrada, rojo para salida. Se captura GPS automáticamente.
3. **Historial**: Vista mensual con resumen de días, tardanzas y horas trabajadas.
4. **Perfil**: Datos del empleado y opción de cerrar sesión.

## Notificaciones push

Las notificaciones de recordatorio se programan localmente en el dispositivo.
El servidor puede enviar notificaciones Expo a los dispositivos registrados (push token guardado en BD).

## Build para producción (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android
eas build --platform ios
```
