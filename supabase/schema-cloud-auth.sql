-- Phase 3 : comptes cloud (auth web + sync identité desktop)
-- Exécuter dans l'éditeur SQL Supabase après schema-cloud.sql

CREATE TABLE IF NOT EXISTS cloud_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  recovery_code_hash TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES cloud_accounts(id) ON DELETE CASCADE,
  ecole_slug TEXT NOT NULL REFERENCES ecoles(slug) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','secretaire','enseignant','comptable','parent')),
  nom TEXT,
  prenom TEXT,
  telephone TEXT,
  is_primary_admin BOOLEAN NOT NULL DEFAULT false,
  local_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, ecole_slug)
);

CREATE INDEX IF NOT EXISTS cloud_users_ecole_slug_idx ON cloud_users (ecole_slug);
CREATE INDEX IF NOT EXISTS cloud_users_account_idx ON cloud_users (account_id);

ALTER TABLE cloud_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cloud_accounts_service_only ON cloud_accounts;
CREATE POLICY cloud_accounts_service_only ON cloud_accounts FOR ALL USING (false);

DROP POLICY IF EXISTS cloud_users_service_only ON cloud_users;
CREATE POLICY cloud_users_service_only ON cloud_users FOR ALL USING (false);
