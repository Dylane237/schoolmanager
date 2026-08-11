import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'
import { runDailyBackup, listBackups, exportDatabase } from '../../../lib/backup'
import { requireModule } from '../../../lib/rbac.server'
import path from 'path'
import { getBackupsDir } from '../../../lib/paths'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  runDailyBackup()
  const backups = listBackups()

  return NextResponse.json({ backups })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const body = await request.json()
  const action = body.action as string

  if (action === 'manual') {
    const result = runDailyBackup()
    if (!result.success) {
      return NextResponse.json({ error: 'Échec de la sauvegarde' }, { status: 500 })
    }
    return NextResponse.json({ success: true, path: result.path, skipped: result.skipped })
  }

  if (action === 'export') {
    const timestamp = new Date().toISOString().slice(0, 10)
    const exportPath = path.join(getBackupsDir(), `export-manuel-${timestamp}.db`)
    const ok = exportDatabase(exportPath)
    if (!ok) {
      return NextResponse.json({ error: 'Échec de l\'export' }, { status: 500 })
    }
    return NextResponse.json({ success: true, path: exportPath })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
