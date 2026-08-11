import { NextRequest, NextResponse } from 'next/server'
import { syncLicenceMetaToCloud } from '@/lib/licence-cloud-sync'

/** Synchronise le nom / slug école depuis le desktop vers Supabase (backfill + maintenance). */
export async function POST(request: NextRequest) {
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[sync-licence-meta]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
