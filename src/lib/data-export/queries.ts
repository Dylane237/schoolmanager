import type Database from 'better-sqlite3'
import type { ExportDataset, ExportEntity } from './types'

function ecoleNom(db: Database.Database, ecoleId: string): string {
  const row = db.prepare('SELECT nom FROM ecoles WHERE id = ?').get(ecoleId) as { nom: string } | undefined
  return row?.nom ?? 'École'
}

export function fetchExportDataset(
  db: Database.Database,
  ecoleId: string,
  entity: ExportEntity
): ExportDataset {
  const exportedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const school = ecoleNom(db, ecoleId)

  switch (entity) {
    case 'eleves':
      return {
        entity,
        title: 'Élèves',
        ecoleNom: school,
        exportedAt,
        columns: [
          { key: 'numero_matricule', label: 'Matricule' },
          { key: 'nom', label: 'Nom' },
          { key: 'prenom', label: 'Prénom' },
          { key: 'sexe', label: 'Sexe' },
          { key: 'classe', label: 'Classe' },
          { key: 'section', label: 'Section' },
          { key: 'date_naissance', label: 'Date naissance' },
          { key: 'lieu_naissance', label: 'Lieu naissance' },
          { key: 'statut', label: 'Statut' },
          { key: 'parent_nom', label: 'Parent' },
          { key: 'parent_telephone', label: 'Téléphone parent' },
          { key: 'annee_entree', label: 'Année entrée' },
        ],
        rows: db.prepare(`
          SELECT
            e.numero_matricule,
            e.nom,
            e.prenom,
            e.sexe,
            c.nom as classe,
            e.section,
            e.date_naissance,
            e.lieu_naissance,
            e.statut,
            p.nom as parent_nom,
            p.telephone as parent_telephone,
            e.annee_entree
          FROM eleves e
          LEFT JOIN classes c ON c.id = e.classe_id
          LEFT JOIN parents p ON p.eleve_id = e.id AND p.est_principal = 1
          WHERE e.ecole_id = ?
          ORDER BY e.nom, e.prenom
        `).all(ecoleId) as Record<string, unknown>[],
      }

    case 'classes':
      return {
        entity,
        title: 'Classes',
        ecoleNom: school,
        exportedAt,
        columns: [
          { key: 'nom', label: 'Nom' },
          { key: 'section', label: 'Section' },
          { key: 'niveau', label: 'Niveau' },
          { key: 'annee_scolaire', label: 'Année scolaire' },
          { key: 'capacite_max', label: 'Capacité max' },
          { key: 'nb_eleves', label: 'Effectif' },
          { key: 'enseignant', label: 'Enseignant' },
        ],
        rows: db.prepare(`
          SELECT
            c.nom,
            c.section,
            c.niveau,
            c.annee_scolaire,
            c.capacite_max,
            COUNT(e.id) as nb_eleves,
            TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) as enseignant
          FROM classes c
          LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
          LEFT JOIN personnel p ON p.id = c.personnel_id
          WHERE c.ecole_id = ?
          GROUP BY c.id
          ORDER BY c.section, c.nom
        `).all(ecoleId) as Record<string, unknown>[],
      }

    case 'paiements':
      return {
        entity,
        title: 'Paiements',
        ecoleNom: school,
        exportedAt,
        columns: [
          { key: 'date_paiement', label: 'Date' },
          { key: 'eleve_nom', label: 'Nom' },
          { key: 'eleve_prenom', label: 'Prénom' },
          { key: 'numero_matricule', label: 'Matricule' },
          { key: 'classe', label: 'Classe' },
          { key: 'montant', label: 'Montant' },
          { key: 'mode_paiement', label: 'Mode' },
          { key: 'tranche_numero', label: 'Tranche' },
          { key: 'recu_numero', label: 'N° reçu' },
        ],
        rows: db.prepare(`
          SELECT
            p.date_paiement,
            e.nom as eleve_nom,
            e.prenom as eleve_prenom,
            e.numero_matricule,
            c.nom as classe,
            p.montant,
            p.mode_paiement,
            p.tranche_numero,
            p.recu_numero
          FROM paiements p
          LEFT JOIN eleves e ON e.id = p.eleve_id
          LEFT JOIN classes c ON c.id = e.classe_id
          WHERE p.ecole_id = ?
          ORDER BY p.date_paiement DESC, p.created_at DESC
        `).all(ecoleId) as Record<string, unknown>[],
      }

    case 'notes':
      return {
        entity,
        title: 'Notes',
        ecoleNom: school,
        exportedAt,
        columns: [
          { key: 'eleve_nom', label: 'Nom' },
          { key: 'eleve_prenom', label: 'Prénom' },
          { key: 'numero_matricule', label: 'Matricule' },
          { key: 'classe', label: 'Classe' },
          { key: 'matiere', label: 'Matière' },
          { key: 'periode', label: 'Période' },
          { key: 'note', label: 'Note' },
          { key: 'coefficient', label: 'Coef.' },
          { key: 'appreciation', label: 'Appréciation' },
        ],
        rows: db.prepare(`
          SELECT
            e.nom as eleve_nom,
            e.prenom as eleve_prenom,
            e.numero_matricule,
            c.nom as classe,
            m.nom as matiere,
            n.periode,
            n.note,
            m.coefficient,
            n.appreciation
          FROM notes n
          JOIN eleves e ON e.id = n.eleve_id
          LEFT JOIN classes c ON c.id = e.classe_id
          JOIN matieres m ON m.id = n.matiere_id
          WHERE e.ecole_id = ?
          ORDER BY c.nom, e.nom, m.nom, n.periode
        `).all(ecoleId) as Record<string, unknown>[],
      }

    case 'presences':
      return {
        entity,
        title: 'Présences',
        ecoleNom: school,
        exportedAt,
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'eleve_nom', label: 'Nom' },
          { key: 'eleve_prenom', label: 'Prénom' },
          { key: 'numero_matricule', label: 'Matricule' },
          { key: 'classe', label: 'Classe' },
          { key: 'statut', label: 'Statut' },
          { key: 'note', label: 'Note' },
        ],
        rows: db.prepare(`
          SELECT
            pr.date,
            e.nom as eleve_nom,
            e.prenom as eleve_prenom,
            e.numero_matricule,
            c.nom as classe,
            pr.statut,
            pr.note
          FROM presences pr
          JOIN eleves e ON e.id = pr.eleve_id
          LEFT JOIN classes c ON c.id = e.classe_id
          WHERE pr.ecole_id = ?
          ORDER BY pr.date DESC, e.nom
        `).all(ecoleId) as Record<string, unknown>[],
      }

    case 'personnel':
      return {
        entity,
        title: 'Personnel',
        ecoleNom: school,
        exportedAt,
        columns: [
          { key: 'nom', label: 'Nom' },
          { key: 'prenom', label: 'Prénom' },
          { key: 'type', label: 'Type' },
          { key: 'telephone', label: 'Téléphone' },
          { key: 'email', label: 'Email' },
          { key: 'contrat', label: 'Contrat' },
          { key: 'date_embauche', label: 'Date embauche' },
        ],
        rows: db.prepare(`
          SELECT nom, prenom, type, telephone, email, contrat, date_embauche
          FROM personnel
          WHERE ecole_id = ?
          ORDER BY nom, prenom
        `).all(ecoleId) as Record<string, unknown>[],
      }
  }
}
