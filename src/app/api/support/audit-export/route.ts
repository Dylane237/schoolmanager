import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import { getRecentAuditLogs } from '@/lib/audit-log'

/** Export journal d'audit (support client). */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au directeur' }, { status: 403 })
  }

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const limit = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 200)))
  const module = request.nextUrl.searchParams.get('module')

  const db = getDb()
  let logs = getRecentAuditLogs(db, user.ecole_id, limit)

  if (module) {
    logs = logs.filter(l => l.module === module)
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'json'

  if (format === 'csv') {
    const header = 'date,action,module,entity_id,user_email,details'
    const rows = logs.map(l => [
      l.created_at,
      l.action,
      l.module,
      l.entity_id ?? '',
      l.user_email ?? '',
      (l.details ?? '').replace(/"/g, '""'),
    ].map(v => `"${v}"`).join(','))
    const csv = [header, ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-${user.ecole_id?.slice(0, 8)}.csv"`,
      },
    })
  }

  return NextResponse.json({ exported_at: new Date().toISOString(), logs })
}
