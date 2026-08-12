import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { requireModule } from '../../../../lib/rbac.server'
import {
  fetchExportDataset,
  formatExport,
  ENTITY_MODULES,
  EXPORT_FORMATS,
  type ExportEntity,
  type ExportFormat,
} from '../../../../lib/data-export'

const ENTITIES: ExportEntity[] = ['eleves', 'classes', 'paiements', 'notes', 'presences', 'personnel']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity') as ExportEntity | null
  const format = (searchParams.get('format') || 'csv') as ExportFormat

  if (!entity || !ENTITIES.includes(entity)) {
    return NextResponse.json({ error: 'Entité invalide' }, { status: 400 })
  }
  if (!EXPORT_FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Format invalide' }, { status: 400 })
  }

  const appModule = ENTITY_MODULES[entity]
  const denied = requireModule(user, appModule, 'GET')
  if (denied) return denied

  const db = getDb()
  const dataset = fetchExportDataset(db, user.ecole_id, entity)
  const { buffer, mime, extension } = formatExport(dataset, format)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${extension}"`,
      'Cache-Control': 'no-store',
    },
  })
}
