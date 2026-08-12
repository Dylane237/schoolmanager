import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import { getRecentAuditLogs } from '@/lib/audit-log'

const MODULE_LABELS: Record<string, string> = {
  paiements: 'Paiements',
  notes: 'Notes',
  users: 'Utilisateurs',
  licence: 'Licence',
  system: 'Système',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
}

/** Journal d'audit — lecture seule (admin). */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au directeur' }, { status: 403 })
  }

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const moduleFilter = request.nextUrl.searchParams.get('module') ?? undefined
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? 50)))

  const db = getDb()
  let logs = getRecentAuditLogs(db, user.ecole_id, limit)

  if (moduleFilter && moduleFilter !== 'tous') {
    logs = logs.filter(l => l.module === moduleFilter)
  }

  return NextResponse.json({
    logs: logs.map(l => ({
      ...l,
      action_label: ACTION_LABELS[l.action] ?? l.action,
      module_label: MODULE_LABELS[l.module] ?? l.module,
      details: l.details ? safeParseJson(l.details) : null,
    })),
    labels: { modules: MODULE_LABELS, actions: ACTION_LABELS },
  })
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
