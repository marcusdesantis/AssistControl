import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.abisoft.tiempoya.admin',
  appName: 'TiempoYa Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
