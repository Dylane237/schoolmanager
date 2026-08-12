import { isSupabaseConfigured } from './supabase-admin'
import { isServerlessRuntime } from './runtime-env'

export async function GET() {
  return Response.json({
    ok: true,
    serverless: isServerlessRuntime(),
    vercel: Boolean(process.env.VERCEL),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    supabase: isSupabaseConfigured(),
    hasJwtSecret: Boolean(process.env.SM_JWT_SECRET),
  })
}
