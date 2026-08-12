-- Phase 2 : sync données opérationnelles (desktop → cloud, lecture web read-only)
-- Exécuter après le schéma de base dans l'éditeur SQL Supabase.

CREATE TABLE IF NOT EXISTS cloud_sync_meta (
  ecole_slug TEXT PRIMARY KEY REFERENCES ecoles(slug) ON DELETE CASCADE,
  annee_scolaire TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  eleves_count INT NOT NULL DEFAULT 0,
  classes_count INT NOT NULL DEFAULT 0,
  machine_fingerprint TEXT,
  app_version TEXT,
  dashboard_stats JSONB
);

CREATE TABLE IF NOT EXISTS cloud_classes (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  section TEXT,
  niveau TEXT,
  annee_scolaire TEXT,
  capacite_max INT,
  nb_eleves INT NOT NULL DEFAULT 0,
  enseignant_nom TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_classes_slug_idx ON cloud_classes (ecole_slug);

CREATE TABLE IF NOT EXISTS cloud_eleves (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  numero_matricule TEXT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe TEXT,
  section TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  classe_local_id TEXT,
  classe_nom TEXT,
  date_naissance TEXT,
  parent_nom TEXT,
  parent_telephone TEXT,
  total_paye NUMERIC NOT NULL DEFAULT 0,
  total_attendu NUMERIC NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_eleves_slug_idx ON cloud_eleves (ecole_slug);
CREATE INDEX IF NOT EXISTS cloud_eleves_classe_idx ON cloud_eleves (ecole_slug, classe_local_id);

CREATE TABLE IF NOT EXISTS cloud_payment_summaries (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  eleve_local_id TEXT NOT NULL,
  numero_matricule TEXT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  classe_local_id TEXT,
  classe_nom TEXT,
  total_attendu NUMERIC NOT NULL DEFAULT 0,
  total_paye NUMERIC NOT NULL DEFAULT 0,
  total_reste NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'non_configure',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, eleve_local_id)
);

CREATE INDEX IF NOT EXISTS cloud_payment_summaries_slug_idx ON cloud_payment_summaries (ecole_slug);

ALTER TABLE cloud_sync_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_payment_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cloud_sync_meta_service_only ON cloud_sync_meta;
CREATE POLICY cloud_sync_meta_service_only ON cloud_sync_meta FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_classes_service_only ON cloud_classes;
CREATE POLICY cloud_classes_service_only ON cloud_classes FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_eleves_service_only ON cloud_eleves;
CREATE POLICY cloud_eleves_service_only ON cloud_eleves FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_payment_summaries_service_only ON cloud_payment_summaries;
CREATE POLICY cloud_payment_summaries_service_only ON cloud_payment_summaries FOR ALL USING (false);
