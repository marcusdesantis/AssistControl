import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  transpilePackages: ['@attendance/shared'],
  // API-only service — no UI pages needed
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
}

export default config
