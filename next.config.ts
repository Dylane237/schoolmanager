import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  // Electron charge l'app via 127.0.0.1 en dev — autoriser le HMR Turbopack
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {},
}

export default nextConfig
