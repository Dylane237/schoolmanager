import type Database from 'better-sqlite3'
import { parseStudentsCsv, type ParsedStudentRow, type StudentSection } from './csv-students'
import { checkStudentLimit } from './licence-limits'
import { generateMatricule } from './matricule'
import { getActiveAnneeScolaire } from './db-server'

export type ImportRowStatus = 'create' | 'assign' | 'missing_class' | 'invalid' | 'duplicate'

export interface ImportPreviewRow extends ParsedStudentRow {
  status: ImportRowStatus
  message?: string
  classeId?: string
  classeNom?: string
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[]
  missingClasses: string[]
  summary: {
    total: number
    create: number
    assign: number
    missing_class: number
    invalid: number
    duplicate: number
  }
}

export interface ImportOptions {
  createMissingClasses: boolean
  defaultSection: StudentSection
}

export interface ImportExecutionResult {
  assigned: number
  created: number
  classesCreated: number
  parentsAdded: number
  errors: string[]
}

interface ClasseRow {
  id: string
  nom: string
  section: string
  capacite_max: number
}

function normName(name: string): string {
  return name.trim().toLowerCase()
}

function resolveClasse(
  classes: ClasseRow[],
  classeName: string | undefined,
  rowSection: StudentSection | undefined,
  defaultSection: StudentSection
): ClasseRow | undefined {
  if (!classeName?.trim()) return undefined

  const matches = classes.filter(c => normName(c.nom) === normName(classeName))
  if (matches.length === 0) return undefined
  if (matches.length === 1) return matches[0]

  const section = rowSection ?? defaultSection
  return matches.find(c => c.section === section) ?? matches[0]
}

export function previewStudentImport(
  db: Database.Database,
  ecoleId: string,
  csvText: string,
  defaultSection: StudentSection = 'francophone'
): ImportPreviewResult {
  const rows = parseStudentsCsv(csvText)
  const annee = getActiveAnneeScolaire(db, ecoleId)
  const classes = db.prepare(`
    SELECT id, nom, section, capacite_max
    FROM classes
    WHERE ecole_id = ? AND annee_scolaire = ?
  `).all(ecoleId, annee) as ClasseRow[]

  const seenMatricules = new Set<string>()
  const previewRows: ImportPreviewRow[] = []
  const missingSet = new Set<string>()

  for (const row of rows) {
    const matricule = row.matricule?.trim()
    if (matricule) {
      if (seenMatricules.has(matricule.toLowerCase())) {
        previewRows.push({ ...row, status: 'duplicate', message: 'Matricule en double dans le fichier' })
        continue
      }
      seenMatricules.add(matricule.toLowerCase())
    }

    const existing = matricule
      ? db.prepare('SELECT id FROM eleves WHERE numero_matricule = ? AND ecole_id = ?')
          .get(matricule, ecoleId) as { id: string } | undefined
      : undefined

    const classe = resolveClasse(classes, row.classe, row.section, defaultSection)

    if (existing) {
      previewRows.push({
        ...row,
        status: 'assign',
        classeId: classe?.id,
        classeNom: classe?.nom ?? row.classe,
        message: classe ? undefined : 'Classe introuvable — réaffectation partielle',
      })
      if (row.classe && !classe) missingSet.add(row.classe.trim())
      continue
    }

    if (!row.nom?.trim() || !row.prenom?.trim()) {
      previewRows.push({
        ...row,
        status: 'invalid',
        message: 'Nom et prénom requis pour un nouvel élève',
      })
      continue
    }

    if (row.classe && !classe) {
      previewRows.push({
        ...row,
        status: 'missing_class',
        classeNom: row.classe,
        message: `Classe « ${row.classe} » introuvable`,
      })
      missingSet.add(row.classe.trim())
      continue
    }

    previewRows.push({
      ...row,
      status: 'create',
      classeId: classe?.id,
      classeNom: classe?.nom ?? row.classe,
    })
  }

  const summary = {
    total: previewRows.length,
    create: previewRows.filter(r => r.status === 'create').length,
    assign: previewRows.filter(r => r.status === 'assign').length,
    missing_class: previewRows.filter(r => r.status === 'missing_class').length,
    invalid: previewRows.filter(r => r.status === 'invalid').length,
    duplicate: previewRows.filter(r => r.status === 'duplicate').length,
  }

  return {
    rows: previewRows,
    missingClasses: [...missingSet],
    summary,
  }
}

export function executeStudentImport(
  db: Database.Database,
  ecoleId: string,
  csvText: string,
  options: ImportOptions
): ImportExecutionResult {
  const preview = previewStudentImport(db, ecoleId, csvText, options.defaultSection)
  const annee = getActiveAnneeScolaire(db, ecoleId)

  let assigned = 0
  let created = 0
  let classesCreated = 0
  let parentsAdded = 0
  const errors: string[] = []

  const getClasses = () => db.prepare(`
    SELECT id, nom, section, capacite_max
    FROM classes
    WHERE ecole_id = ? AND annee_scolaire = ?
  `).all(ecoleId, annee) as ClasseRow[]

  let classes = getClasses()

  const ensureClasse = (row: ImportPreviewRow): ClasseRow | undefined => {
    let classe = resolveClasse(classes, row.classe, row.section, options.defaultSection)
    if (classe || !row.classe?.trim()) return classe

    if (!options.createMissingClasses) return undefined

    const section = row.section ?? options.defaultSection
    db.prepare(`
      INSERT INTO classes (ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(ecoleId, row.classe.trim(), section, null, annee, 60)

    classes = getClasses()
    classesCreated++
    classe = resolveClasse(classes, row.classe, row.section, options.defaultSection)
    return classe
  }

  const assignEleve = db.prepare(
    'UPDATE eleves SET classe_id = ?, section = ? WHERE id = ? AND ecole_id = ?'
  )
  const insertEleve = db.prepare(`
    INSERT INTO eleves (
      ecole_id, classe_id, numero_matricule, nom, prenom,
      date_naissance, sexe, section, annee_entree, statut
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif')
  `)
  const insertParent = db.prepare(`
    INSERT INTO parents (eleve_id, nom, prenom, telephone, lien, est_principal)
    VALUES (?, ?, ?, ?, 'tuteur', 1)
  `)
  const countInClasse = db.prepare(
    "SELECT COUNT(*) as count FROM eleves WHERE classe_id = ? AND statut = 'actif'"
  )

  const importTx = db.transaction(() => {
    for (const row of preview.rows) {
      if (row.status === 'duplicate' || row.status === 'invalid') continue

      const matricule = row.matricule?.trim()
      const existing = matricule
        ? db.prepare('SELECT id FROM eleves WHERE numero_matricule = ? AND ecole_id = ?')
            .get(matricule, ecoleId) as { id: string } | undefined
        : undefined

      if (existing) {
        const classe = ensureClasse(row)
        if (row.classe && !classe) {
          errors.push(`Ligne ${row.line} : classe « ${row.classe} » introuvable`)
          continue
        }
        if (classe) {
          const nb = (countInClasse.get(classe.id) as { count: number }).count
          if (nb >= classe.capacite_max) {
            errors.push(`Ligne ${row.line} : classe « ${classe.nom} » pleine`)
            continue
          }
          assignEleve.run(classe.id, classe.section, existing.id, ecoleId)
        }
        assigned++
        continue
      }

      if (row.status === 'missing_class' && !options.createMissingClasses) continue
      if (row.status !== 'create' && row.status !== 'missing_class') continue

      const limitError = checkStudentLimit(db, ecoleId)
      if (limitError) {
        errors.push(limitError)
        break
      }

      const classe = ensureClasse(row)
      if (row.classe && !classe) {
        errors.push(`Ligne ${row.line} : classe « ${row.classe} » introuvable`)
        continue
      }

      if (classe) {
        const nb = (countInClasse.get(classe.id) as { count: number }).count
        if (nb >= classe.capacite_max) {
          errors.push(`Ligne ${row.line} : classe « ${classe.nom} » pleine`)
          continue
        }
      }

      const section = classe?.section ?? row.section ?? options.defaultSection
      const mat = matricule || (classe
        ? generateMatricule(db, ecoleId, classe.id)
        : `PROV-${new Date().getFullYear().toString().slice(-2)}-${String(created + 1).padStart(3, '0')}`)

      insertEleve.run(
        ecoleId,
        classe?.id ?? null,
        mat,
        row.nom!.trim(),
        row.prenom!.trim(),
        row.date_naissance || null,
        row.sexe ?? null,
        section,
        new Date().getFullYear().toString()
      )

      const eleve = db.prepare('SELECT id FROM eleves WHERE numero_matricule = ?')
        .get(mat) as { id: string }

      if (row.parent_telephone?.trim()) {
        insertParent.run(
          eleve.id,
          row.parent_nom?.trim() || row.nom!.trim(),
          null,
          row.parent_telephone.trim()
        )
        parentsAdded++
      }

      created++
    }
  })

  importTx()

  return { assigned, created, classesCreated, parentsAdded, errors }
}
