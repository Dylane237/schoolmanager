import 'server-only'

/** Lit une variable d'environnement à l'exécution (évite l'inlining Next.js au build). */
export function runtimeEnv(name: string): string | undefined {
  return process.env[name]
}
