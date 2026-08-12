import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getCloudSyncStatus, isCloudReadMode } from '@/lib/cloud-read'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const status = await getCloudSyncStatus(user.ecole_slug)

  return NextResponse.json({
    ...status,
    cloudReadMode: isCloudReadMode(),
    readOnly: isCloudReadMode(),
  })
}
