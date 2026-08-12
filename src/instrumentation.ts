export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { runtimeEnv } = await import('./lib/runtime-env')
      if (!runtimeEnv('SM_JWT_SECRET')) {
        const { getJwtSecret } = await import('./lib/secrets')
        process.env.SM_JWT_SECRET = getJwtSecret()
      }
    } catch (error) {
      console.error('[SchoolManager] instrumentation JWT init:', error)
    }
  }
}
