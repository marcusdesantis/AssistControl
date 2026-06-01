import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async rewrites() {
    return [
      { source: '/control-asistencia', destination: '/control-asistencia.html' },
      { source: '/asistencia-laboral', destination: '/asistencia-laboral.html' },
      { source: '/huella-biometrica',  destination: '/huella-biometrica.html'  },
      { source: '/account-deletion',   destination: '/account-deletion.html'   },
    ]
  },
}

export default config
