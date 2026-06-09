import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async rewrites() {
    return [
{ source: '/control-personal-limpieza', destination: '/control-personal-limpieza.html' },
      { source: '/control-asistencia-logistica', destination: '/control-asistencia-logistica.html' },
      { source: '/huella-biometrica',  destination: '/huella-biometrica.html'  },
      { source: '/account-deletion',   destination: '/account-deletion.html'   },
    ]
  },
}

export default config
