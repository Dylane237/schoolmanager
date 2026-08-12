import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse, verifyServerSecret } from '@/lib/rate-limit'
import { upsertSchoolDataOnCloud } from '@/lib/cloud-data-store'
import type { SchoolSyncPayload } from '@/lib/sync-payload'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(`sync-push:${ip}`, 20, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec ?? 60)

  if (!verifyServerSecret(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as SchoolSyncPayload

    if (!body.ecole_slug?.trim() || !body.cle_licence?.trim()) {
      return NextResponse.json({ error: 'Payload incomplet' }, { status: 400 })
    }

    const result = await upsertSchoolDataOnCloud(body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      counts: result.counts,
    })
  } catch (err) {
    console.error('[sync/push]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
