-- SchoolManager — schéma cloud (Supabase)
-- Exécuter dans l'éditeur SQL Supabase du projet lié à Vercel.

-- Métadonnées école sur les licences activées
ALTER TABLE licences ADD COLUMN IF NOT EXISTS ecole_slug TEXT;
ALTER TABLE licences ADD COLUMN IF NOT EXISTS ecole_nom TEXT;
ALTER TABLE licences ADD COLUMN IF NOT EXISTS parrain_code TEXT;
ALTER TABLE licences ADD COLUMN IF NOT EXISTS machine_fingerprint TEXT;
ALTER TABLE licences ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Registre cloud des établissements (miroir des inscriptions desktop)
CREATE TABLE IF NOT EXISTS ecoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  directeur_nom TEXT,
  telephone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecoles_slug_idx ON ecoles (slug);

-- Parrainages centralisés (vue éditeur)
CREATE TABLE IF NOT EXISTS parrainages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT,
  parrain_code TEXT NOT NULL,
  parrain_ecole_slug TEXT,
  parrain_ecole_nom TEXT NOT NULL,
  parrain_directeur_nom TEXT,
  contact_nom TEXT NOT NULL,
  contact_ecole TEXT,
  contact_telephone TEXT NOT NULL,
  notes TEXT,
  statut TEXT NOT NULL DEFAULT 'en_cours'
    CHECK (statut IN ('en_cours', 'abonnement_actif', 'commission_versee', 'annule')),
  montant_abonnement NUMERIC,
  commission_pct NUMERIC NOT NULL DEFAULT 10,
  commission_montant NUMERIC,
  filleul_ecole_slug TEXT,
  filleul_ecole_nom TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS parrainages_local_dedup
  ON parrainages (parrain_code, local_id)
  WHERE local_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS parrainages_parrain_code_idx ON parrainages (parrain_code);
CREATE INDEX IF NOT EXISTS parrainages_statut_idx ON parrainages (statut);
