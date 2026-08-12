import 'server-only'

/** Lit une variable d'environnement à l'exécution (évite l'inlining Next.js au build). */
export function runtimeEnv(name: string): string | undefined {
  return process.env[name]
}

/** Vercel / AWS Lambda — statique (build Vercel) + dynamique (runtime). */
export function isServerlessRuntime(): boolean {
  // Inliné à "1" quand le build tourne sur Vercel
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') return true

  const staticVercelEnv = process.env.VERCEL_ENV
  if (
    staticVercelEnv === 'production'
    || staticVercelEnv === 'preview'
    || staticVercelEnv === 'development'
  ) {
    return true
  }

  const vercel = runtimeEnv('VERCEL')
  if (vercel === '1' || vercel === 'true') return true

  const vercelEnv = runtimeEnv('VERCEL_ENV')
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return true
  }

  if (runtimeEnv('AWS_LAMBDA_FUNCTION_NAME')) return true
  if (runtimeEnv('AWS_EXECUTION_ENV')) return true

  return false
}

/** @deprecated Alias — préférer isServerlessRuntime */
export function isVercelRuntime(): boolean {
  return isServerlessRuntime()
}
