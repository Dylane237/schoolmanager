-- 001: Journal d'audit (paiements, notes, utilisateurs)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  module TEXT NOT NULL CHECK (module IN ('paiements', 'notes', 'users', 'licence', 'system')),
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_ecole_date ON audit_log(ecole_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_log(ecole_id, module);
