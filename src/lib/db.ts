import Database from 'better-sqlite3'
import { getDbPath, ensureUserDataDir } from './paths'

let _db: InstanceType<typeof Database> | null = null

export function getDb() {
  if (_db) return _db
  ensureUserDataDir()
  _db = new Database(getDbPath())
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
  runMigrations(_db)
  seedInitialData(_db)
  return _db
}

function initSchema(db: InstanceType<typeof Database>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ecoles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      nom TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      telephone TEXT,
      adresse TEXT,
      email TEXT,
      directeur_nom TEXT,
      sections TEXT DEFAULT '["francophone"]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS annees_scolaires (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT NOT NULL REFERENCES ecoles(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      date_debut TEXT,
      date_fin TEXT,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(ecole_id, label)
    );

    CREATE TABLE IF NOT EXISTS licences (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      type TEXT CHECK (type IN ('starter','standard','premium')),
      date_debut TEXT NOT NULL,
      date_fin TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      cle_licence TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id),
      role TEXT CHECK (role IN ('super_admin','admin','secretaire','enseignant','comptable','parent')),
      nom TEXT,
      prenom TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      telephone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      section TEXT CHECK (section IN ('francophone','anglophone','maternelle')),
      niveau TEXT,
      annee_scolaire TEXT NOT NULL,
      annee_scolaire_id TEXT REFERENCES annees_scolaires(id),
      enseignant_id TEXT REFERENCES users(id),
      capacite_max INTEGER DEFAULT 60,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eleves (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      classe_id TEXT REFERENCES classes(id),
      numero_matricule TEXT UNIQUE,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      lieu_naissance TEXT,
      sexe TEXT CHECK (sexe IN ('M','F')),
      photo_url TEXT,
      section TEXT CHECK (section IN ('francophone','anglophone','maternelle')),
      statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif','transfere','archive')),
      statut_annuel TEXT CHECK (statut_annuel IN ('admis','redoublant','en_attente')),
      annee_entree TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      eleve_id TEXT REFERENCES eleves(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      prenom TEXT,
      telephone TEXT NOT NULL,
      lien TEXT,
      est_principal INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tranches_config (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      classe_id TEXT REFERENCES classes(id),
      tranche_numero INTEGER NOT NULL,
      montant_attendu REAL NOT NULL,
      date_limite TEXT,
      annee_scolaire TEXT NOT NULL,
      annee_scolaire_id TEXT REFERENCES annees_scolaires(id)
    );

    CREATE TABLE IF NOT EXISTS frais_annexes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      classe_id TEXT REFERENCES classes(id),
      label TEXT NOT NULL,
      montant REAL NOT NULL,
      obligatoire INTEGER DEFAULT 0,
      annee_scolaire TEXT NOT NULL,
      annee_scolaire_id TEXT REFERENCES annees_scolaires(id)
    );

    CREATE TABLE IF NOT EXISTS paiements (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      eleve_id TEXT REFERENCES eleves(id),
      frais_annexe_id TEXT REFERENCES frais_annexes(id),
      tranche_numero INTEGER,
      montant REAL NOT NULL,
      date_paiement TEXT DEFAULT (date('now')),
      mode_paiement TEXT CHECK (mode_paiement IN ('especes','orange_money','mtn_momo','virement')),
      recu_numero TEXT UNIQUE,
      enregistre_par TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matieres (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      classe_id TEXT REFERENCES classes(id),
      nom TEXT NOT NULL,
      nom_en TEXT,
      coefficient REAL DEFAULT 1,
      section TEXT CHECK (section IN ('francophone','anglophone','maternelle')),
      enseignant_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      eleve_id TEXT REFERENCES eleves(id),
      matiere_id TEXT REFERENCES matieres(id),
      periode TEXT NOT NULL,
      note REAL CHECK (note >= 0 AND note <= 100),
      appreciation TEXT,
      saisie_par TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competences_maternelle (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      eleve_id TEXT REFERENCES eleves(id),
      periode TEXT NOT NULL,
      domaine TEXT NOT NULL,
      competence TEXT NOT NULL,
      statut TEXT CHECK (statut IN ('acquis','en_cours','non_acquis')),
      observation TEXT,
      saisie_par TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS presences (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      eleve_id TEXT REFERENCES eleves(id),
      date TEXT DEFAULT (date('now')),
      statut TEXT CHECK (statut IN ('present','absent','retard','excuse')),
      note TEXT,
      alerte_envoyee INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      prenom TEXT,
      telephone TEXT,
      email TEXT,
      type TEXT CHECK (type IN ('enseignant','administratif','assistant_maternelle','securite','entretien','chauffeur')),
      contrat TEXT CHECK (contrat IN ('cdi','cdd','vacataire','benevole')),
      date_embauche TEXT,
      salaire REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS academic_histories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      eleve_id TEXT REFERENCES eleves(id),
      classe_id TEXT REFERENCES classes(id),
      annee TEXT NOT NULL,
      statut TEXT CHECK (statut IN ('admis','redoublant')),
      moyenne REAL,
      rang INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS liste_attente (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
      classe_id TEXT REFERENCES classes(id),
      eleve_id TEXT REFERENCES eleves(id),
      position INTEGER,
      date_ajout TEXT DEFAULT (datetime('now')),
      statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','admis','annule'))
    );

    CREATE TABLE IF NOT EXISTS annonces (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ecole_id TEXT NOT NULL REFERENCES ecoles(id) ON DELETE CASCADE,
      titre TEXT NOT NULL,
      contenu TEXT NOT NULL,
      cible TEXT DEFAULT 'tous' CHECK (cible IN ('tous','personnel','parents','enseignants')),
      priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('normale','importante','urgente')),
      auteur_id TEXT REFERENCES users(id),
      date_publication TEXT DEFAULT (datetime('now')),
      date_expiration TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parametres_maternelle (
      ecole_id TEXT PRIMARY KEY REFERENCES ecoles(id) ON DELETE CASCADE,
      valeur TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_eleves_ecole ON eleves(ecole_id);
    CREATE INDEX IF NOT EXISTS idx_eleves_classe ON eleves(ecole_id, classe_id);
    CREATE INDEX IF NOT EXISTS idx_paiements_ecole ON paiements(ecole_id);
    CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON paiements(ecole_id, eleve_id);
    CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
    CREATE INDEX IF NOT EXISTS idx_notes_ecole ON notes(ecole_id, periode);
    CREATE INDEX IF NOT EXISTS idx_presences_date ON presences(date, ecole_id);
    CREATE INDEX IF NOT EXISTS idx_presences_eleve ON presences(eleve_id, date);
    CREATE INDEX IF NOT EXISTS idx_classes_ecole ON classes(ecole_id);
    CREATE INDEX IF NOT EXISTS idx_licences_ecole ON licences(ecole_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_annees_ecole ON annees_scolaires(ecole_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_annonces_ecole ON annonces(ecole_id, is_active);
  `)
}

function runMigrations(db: InstanceType<typeof Database>) {
  // Supprimer les données de démonstration des installations existantes
  const demoEcole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get('demo') as { id: string } | undefined
  if (demoEcole) {
    db.prepare('DELETE FROM users WHERE ecole_id = ?').run(demoEcole.id)
    db.prepare('DELETE FROM ecoles WHERE slug = ?').run('demo')
  }
  db.prepare('DELETE FROM users WHERE email = ?').run('demo@schoolmanager.cm')

  const cols = db.prepare(`PRAGMA table_info(notes)`).all() as { name: string }[]
  const noteCol = cols.find(c => c.name === 'note')
  if (noteCol) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes_new (
        id TEXT PRIMARY KEY,
        ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
        eleve_id TEXT REFERENCES eleves(id),
        matiere_id TEXT REFERENCES matieres(id),
        periode TEXT NOT NULL,
        note REAL CHECK (note >= 0 AND note <= 100),
        appreciation TEXT,
        saisie_par TEXT REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)
    const hasOldConstraint = db.prepare(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='notes'
    `).get() as { sql: string } | undefined
    if (hasOldConstraint?.sql?.includes('<= 20')) {
      db.exec(`
        INSERT OR IGNORE INTO notes_new SELECT * FROM notes;
        DROP TABLE notes;
        ALTER TABLE notes_new RENAME TO notes;
        CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
        CREATE INDEX IF NOT EXISTS idx_notes_ecole ON notes(ecole_id, periode);
      `)
    } else {
      db.exec(`DROP TABLE IF EXISTS notes_new`)
    }
  }

  const classCols = db.prepare(`PRAGMA table_info(classes)`).all() as { name: string }[]
  if (!classCols.find(c => c.name === 'personnel_id')) {
    db.exec(`ALTER TABLE classes ADD COLUMN personnel_id TEXT REFERENCES personnel(id)`)
  }

  const licenceCols = db.prepare(`PRAGMA table_info(licences)`).all() as { name: string }[]
  if (!licenceCols.find(c => c.name === 'machine_fingerprint')) {
    db.exec(`ALTER TABLE licences ADD COLUMN machine_fingerprint TEXT`)
  }
}

function seedInitialData(db: InstanceType<typeof Database>) {
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('super_admin')
  if (existing) return

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require('bcryptjs')
  const defaultPassword = process.env.SM_SUPER_ADMIN_PASSWORD || 'Admin2026!'
  const hash = bcrypt.hashSync(defaultPassword, 12)

  db.prepare(`
    INSERT INTO users (email, password_hash, nom, role)
    VALUES (?, ?, ?, ?)
  `).run('admin@schoolmanager.cm', hash, 'Super Admin', 'super_admin')
}

export function getActiveAnneeScolaire(db: InstanceType<typeof Database>, ecoleId: string): string {
  const row = db.prepare(`
    SELECT label FROM annees_scolaires
    WHERE ecole_id = ? AND is_active = 1
    LIMIT 1
  `).get(ecoleId) as { label: string } | undefined

  if (row) return row.label

  const year = new Date().getFullYear()
  const month = new Date().getMonth()
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}
