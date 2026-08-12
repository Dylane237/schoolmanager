import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'
import { saveElevePhoto } from '../../../lib/upload'
import { requireModule } from '../../../lib/rbac.server'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'eleves', 'POST')
  if (denied) return denied

  const formData = await request.formData()
  const file = formData.get('photo') as File | null
  const eleveId = formData.get('eleve_id') as string | null

  if (!file || !eleveId) {
    return NextResponse.json({ error: 'Photo et identifiant élève requis' }, { status: 400 })
  }

  const db = getDb()
  const eleve = db.prepare(
    'SELECT id, photo_url FROM eleves WHERE id = ? AND ecole_id = ?'
  ).get(eleveId, user.ecole_id) as { id: string; photo_url: string | null } | undefined

  if (!eleve) {
    return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = saveElevePhoto(user.ecole_id, eleveId, buffer, file.type)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  db.prepare('UPDATE eleves SET photo_url = ? WHERE id = ?').run(result.url, eleveId)

  if (user.ecole_slug) {
    const { pushSchoolUploads } = await import('../../../lib/upload-blob-sync')
    pushSchoolUploads(user.ecole_slug, user.ecole_id).catch(() => {})
  }

  return NextResponse.json({ success: true, photo_url: result.url })
}
