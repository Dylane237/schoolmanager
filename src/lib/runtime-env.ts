import 'server-only'

/** Lit une variable d'environnement à l'exécution (évite l'inlining Next.js au build). */
export function runtimeEnv(name: string): string | undefined {
  return process.env[name]
}

/** Vercel serverless — lecture dynamique pour ne pas être figée au build. */
export function isVercelRuntime(): boolean {
  const v = runtimeEnv('VERCEL')
  return v === '1' || v === 'true'
}
