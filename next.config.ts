import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import os from 'os'
import path from 'path'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const documentsDataDir = path
  .join(os.homedir(), 'Documents', 'SchoolManager')
  .replace(/\\/g, '/')

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  turbopack: {},
  outputFileTracingIncludes: {
    '/*': [
      './messages/**/*',
      './node_modules/react/**/*',
      './node_modules/react-dom/**/*',
      './node_modules/react/package.json',
      './node_modules/react-dom/package.json',
      './node_modules/next/package.json',
      './node_modules/next/dist/**/*',
      './node_modules/@swc/helpers/**/*',
      './node_modules/@next/env/**/*',
      './node_modules/postcss/**/*',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      './dist/**',
      './dist2/**',
      './build-log.txt',
      './.git/**',
      './e2e/**',
      './playwright-report/**',
      './test-results/**',
      `${documentsDataDir}/**`,
    ],
  },
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^electron$/ })
    )
    return config
  },
}

export default withNextIntl(nextConfig)