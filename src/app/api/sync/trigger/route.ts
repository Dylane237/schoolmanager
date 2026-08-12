import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { pushSchoolDbFromLocal, getDb, resolveEcoleId } from '@/lib/db-server'
import { pushSchoolDataFromEcoleId } from '@/lib/sync-trigger'

/** Déclenche une sync manuelle desktop ↔ cloud. */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const result = await pushSchoolDbFromLocal(user.ecole_slug)
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Sync échouée' }, { status: 502 })
  }

  const db = getDb()
  const ecoleId = resolveEcoleId(db, user.ecole_slug, user.ecole_id)
  if (ecoleId) pushSchoolDataFromEcoleId(ecoleId)

  return NextResponse.json({
    success: true,
    synced_at: new Date().toISOString(),
    version: result.version,
  })
}
