import 'server-only'

/** Lit une variable d'environnement à l'exécution (évite l'inlining Next.js au build). */
export function runtimeEnv(name: string): string | undefined {
  return process.env[name]
}

/** Vercel / AWS Lambda — lecture dynamique (pas d'inlining Next.js). */
export function isServerlessRuntime(): boolean {
  const vercel = runtimeEnv('VERCEL')
  if (vercel === '1' || vercel === 'true') return true
  const vercelEnv = runtimeEnv('VERCEL_ENV')
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return true
  }
  if (runtimeEnv('AWS_LAMBDA_FUNCTION_NAME')) return true
  return false
}

/** @deprecated Alias — préférer isServerlessRuntime */
export function isVercelRuntime(): boolean {
  return isServerlessRuntime()
}
