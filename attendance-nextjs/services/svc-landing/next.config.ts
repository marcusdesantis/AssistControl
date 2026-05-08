import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async rewrites() {
    return [
      { source: '/landing/tiempoya-landing1', destination: '/empleados.html'    },
      { source: '/landing/tiempoya-landing2', destination: '/empresas.html'     },
      { source: '/landing/tiempoya-landing3', destination: '/productividad.html' },
    ]
  },
}

export default config
