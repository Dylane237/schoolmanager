-- Sync SQLite complète (blob) — parité web / desktop
-- Exécuter dans l'éditeur SQL Supabase après schema-cloud.sql et schema-cloud-auth.sql
--
-- Créer aussi le bucket Storage (Dashboard → Storage → New bucket) :
--   Nom : school-databases
--   Public : non
--   Limite fichier : 50 Mo (ajuster si besoin)

CREATE TABLE IF NOT EXISTS cloud_db_snapshots (
  ecole_slug TEXT PRIMARY KEY REFERENCES ecoles(slug) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  size_bytes BIGINT,
  checksum TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cloud_db_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cloud_db_snapshots_service_only ON cloud_db_snapshots;
CREATE POLICY cloud_db_snapshots_service_only ON cloud_db_snapshots FOR ALL USING (false);
