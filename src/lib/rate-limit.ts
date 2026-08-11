/**
 * Rate limiting simple (fenêtre glissante en mémoire).
 * Suffisant pour Vercel en protection basique ; pas distribué multi-instance.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count += 1
  return { allowed: true }
}

export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({ error: 'Trop de requêtes — réessayez plus tard' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  )
}

/** Vérifie le secret partagé desktop ↔ cloud (referral, sync). */
export function verifyServerSecret(request: Request): boolean {
  const expected = process.env.LICENCE_SERVER_SECRET
  if (!expected) return process.env.NODE_ENV !== 'production'
  const secret = request.headers.get('x-server-secret')
  return secret === expected
}
