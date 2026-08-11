import type Database from 'better-sqlite3'

export type AuditAction = 'create' | 'update' | 'delete'
export type AuditModule = 'paiements' | 'notes' | 'users' | 'licence' | 'system'

export interface AuditEntry {
  ecoleId: string | null
  userId?: string | null
  userEmail?: string | null
  action: AuditAction
  module: AuditModule
  entityId?: string | null
  details?: Record<string, unknown> | null
}

export function logAudit(db: Database.Database, entry: AuditEntry): void {
  db.prepare(`
    INSERT INTO audit_log (ecole_id, user_id, user_email, action, module, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.ecoleId,
    entry.userId ?? null,
    entry.userEmail ?? null,
    entry.action,
    entry.module,
    entry.entityId ?? null,
    entry.details ? JSON.stringify(entry.details) : null,
  )
}

export function getRecentAuditLogs(
  db: Database.Database,
  ecoleId: string,
  limit = 200,
): Array<{
  id: string
  action: string
  module: string
  entity_id: string | null
  details: string | null
  user_email: string | null
  created_at: string
}> {
  return db.prepare(`
    SELECT id, action, module, entity_id, details, user_email, created_at
    FROM audit_log
    WHERE ecole_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(ecoleId, limit) as Array<{
    id: string
    action: string
    module: string
    entity_id: string | null
    details: string | null
    user_email: string | null
    created_at: string
  }>
}

export function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db.prepare(`
      SELECT COALESCE(MAX(version), 0) as v FROM schema_migrations
    `).get() as { v: number }
    return row.v
  } catch {
    return 0
  }
}
