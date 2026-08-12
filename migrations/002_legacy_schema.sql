-- 002: Schéma legacy extrait des migrations inline (tables + hook JS legacy-columns)
CREATE TABLE IF NOT EXISTS parrainages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  parrain_ecole_id TEXT NOT NULL REFERENCES ecoles(id) ON DELETE CASCADE,
  contact_nom TEXT NOT NULL,
  contact_ecole TEXT,
  contact_telephone TEXT NOT NULL,
  notes TEXT,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'abonnement_actif', 'commission_versee', 'annule')),
  montant_abonnement REAL,
  commission_pct REAL DEFAULT 10,
  commission_montant REAL,
  cloud_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS licence_cache (
  cle TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  last_verified TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);
