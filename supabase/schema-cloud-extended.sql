-- Sync structurée complète (paiements, notes, tranches, etc.)
-- Exécuter après schema-cloud.sql dans l'éditeur SQL Supabase.

CREATE TABLE IF NOT EXISTS cloud_paiements (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  eleve_local_id TEXT,
  tranche_numero INT,
  montant NUMERIC NOT NULL DEFAULT 0,
  date_paiement TEXT,
  mode_paiement TEXT,
  recu_numero TEXT,
  frais_annexe_local_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_paiements_slug_idx ON cloud_paiements (ecole_slug);
CREATE INDEX IF NOT EXISTS cloud_paiements_eleve_idx ON cloud_paiements (ecole_slug, eleve_local_id);

CREATE TABLE IF NOT EXISTS cloud_notes (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  eleve_local_id TEXT,
  matiere_local_id TEXT,
  periode TEXT NOT NULL,
  note NUMERIC,
  appreciation TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_notes_slug_idx ON cloud_notes (ecole_slug);
CREATE INDEX IF NOT EXISTS cloud_notes_eleve_idx ON cloud_notes (ecole_slug, eleve_local_id);

CREATE TABLE IF NOT EXISTS cloud_tranches_config (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  classe_local_id TEXT,
  tranche_numero INT NOT NULL,
  montant_attendu NUMERIC NOT NULL DEFAULT 0,
  date_limite TEXT,
  annee_scolaire TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_tranches_slug_idx ON cloud_tranches_config (ecole_slug);
CREATE INDEX IF NOT EXISTS cloud_tranches_classe_idx ON cloud_tranches_config (ecole_slug, classe_local_id);

CREATE TABLE IF NOT EXISTS cloud_matieres (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  classe_local_id TEXT,
  nom TEXT NOT NULL,
  nom_en TEXT,
  coefficient NUMERIC DEFAULT 1,
  section TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_matieres_slug_idx ON cloud_matieres (ecole_slug);

CREATE TABLE IF NOT EXISTS cloud_personnel (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  type TEXT,
  contrat TEXT,
  date_embauche TEXT,
  salaire NUMERIC,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_personnel_slug_idx ON cloud_personnel (ecole_slug);

CREATE TABLE IF NOT EXISTS cloud_frais_annexes (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  classe_local_id TEXT,
  label TEXT NOT NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  obligatoire INT NOT NULL DEFAULT 0,
  type TEXT DEFAULT 'autre',
  date_limite TEXT,
  annee_scolaire TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_frais_annexes_slug_idx ON cloud_frais_annexes (ecole_slug);

CREATE TABLE IF NOT EXISTS cloud_presences (
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  eleve_local_id TEXT,
  date TEXT,
  statut TEXT,
  note TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ecole_slug, local_id)
);

CREATE INDEX IF NOT EXISTS cloud_presences_slug_idx ON cloud_presences (ecole_slug);

ALTER TABLE cloud_paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_tranches_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_frais_annexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_presences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cloud_paiements_service_only ON cloud_paiements;
CREATE POLICY cloud_paiements_service_only ON cloud_paiements FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_notes_service_only ON cloud_notes;
CREATE POLICY cloud_notes_service_only ON cloud_notes FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_tranches_config_service_only ON cloud_tranches_config;
CREATE POLICY cloud_tranches_config_service_only ON cloud_tranches_config FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_matieres_service_only ON cloud_matieres;
CREATE POLICY cloud_matieres_service_only ON cloud_matieres FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_personnel_service_only ON cloud_personnel;
CREATE POLICY cloud_personnel_service_only ON cloud_personnel FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_frais_annexes_service_only ON cloud_frais_annexes;
CREATE POLICY cloud_frais_annexes_service_only ON cloud_frais_annexes FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_presences_service_only ON cloud_presences;
CREATE POLICY cloud_presences_service_only ON cloud_presences FOR ALL USING (false);
