import { CapacitorConfig } from '@capacitor/cli'

// OJO: `appId` es el bundle de **iOS**, no el de Android.
//
// El identificador original `com.abisoft.tiempoya.admin` quedó registrado en la
// cuenta Apple anterior (Soft Potential Ltd) y Apple nunca libera bundle IDs, así
// que desde la cuenta actual (Abisoft S.A, N3NZ647285) no se puede reutilizar.
// Por eso iOS lleva el sufijo `.ios`.
//
// Android conserva `com.abisoft.tiempoya.admin`, fijado en
// android/app/build.gradle (applicationId + namespace). Capacitor sólo lee este
// `appId` al crear una plataforma con `cap add`; `cap sync` no reescribe Gradle,
// así que Android no se ve afectado. Si algún día se regenera android/ desde
// cero, hay que restaurar el applicationId a mano.
const config: CapacitorConfig = {
  appId: 'com.abisoft.tiempoya.admin.ios',
  appName: 'TiempoYa Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      launchFadeOutDuration: 500,
      backgroundColor: '#1e40af',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
  },
  ios: {
    allowsBackForwardNavigationGestures: true,
  },
}

export default config
