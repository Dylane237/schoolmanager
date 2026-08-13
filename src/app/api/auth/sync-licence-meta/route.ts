import { NextRequest, NextResponse } from 'next/server'
import { syncLicenceMetaToCloud } from '@/lib/licence-cloud-sync'
import { markDesktopEverUsed } from '@/lib/platform-presence'
import { checkRateLimit, rateLimitResponse, verifyServerSecret } from '@/lib/rate-limit'

/** Synchronise le nom / slug école depuis le desktop vers Supabase (backfill + maintenance). */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`sync-meta:${ip}`, 60, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec ?? 60)

  if (!verifyServerSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await syncLicenceMetaToCloud({
      cle: String(body.cle ?? ''),
      ecole_nom: String(body.ecole_nom ?? ''),
      ecole_slug: String(body.ecole_slug ?? ''),
      machine_fingerprint: body.machine_fingerprint ?? null,
      directeur_nom: body.directeur_nom ?? null,
      telephone: body.telephone ?? null,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const slug = String(body.ecole_slug ?? '').trim()
    if (slug) void markDesktopEverUsed(slug).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[sync-licence-meta]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
