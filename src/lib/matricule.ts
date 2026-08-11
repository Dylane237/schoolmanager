/**
 * Génère un matricule selon le format : 26FSILA001
 * - 26     : 2 derniers chiffres de l'année d'arrivée
 * - F/A/M  : section (Francophone / Anglophone / Maternelle)
 * - SIL    : nom de la classe (sans la lettre finale)
 * - A      : lettre de la classe (si présente)
 * - 001    : numéro d'ordre cumulatif par classe (3 chiffres)
 */

import type BetterSqlite3 from 'better-sqlite3'

type Database = BetterSqlite3.Database

function getSectionCode(section: string): string {
  switch (section?.toLowerCase()) {
    case 'francophone': return 'F'
    case 'anglophone':  return 'A'
    case 'maternelle':  return 'M'
    default:            return 'F'
  }
}

/**
 * Extrait le nom de base et la lettre d'une classe
 * Ex: "SIL A" → { base: "SIL", lettre: "A" }
 * Ex: "6ème B" → { base: "6EME", lettre: "B" }
 * Ex: "CP" → { base: "CP", lettre: "" }
 */
function parseClasseName(nom: string): { base: string; lettre: string } {
  const parts = nom.trim().toUpperCase().split(/\s+/)
  const last = parts[parts.length - 1]

  // Si le dernier mot est une lettre unique (A-Z), c'est la lettre de classe
  if (parts.length > 1 && /^[A-Z]$/.test(last)) {
    return {
      base: parts.slice(0, -1).join(''),
      lettre: last,
    }
  }

  return { base: parts.join(''), lettre: '' }
}

/**
 * Génère le prochain matricule pour un élève dans une classe donnée
 */
export function generateMatricule(
  db: Database,
  ecoleId: string,
  classeId: string,
  anneeArrivee?: number
): string {
  const year = (anneeArrivee ?? new Date().getFullYear()).toString().slice(-2)

  // Récupère les infos de la classe
  const classe = db.prepare(
    'SELECT nom, section FROM classes WHERE id = ? AND ecole_id = ?'
  ).get(classeId, ecoleId) as { nom: string; section: string } | undefined

  if (!classe) throw new Error('Classe introuvable')

  const sectionCode = getSectionCode(classe.section)
  const { base, lettre } = parseClasseName(classe.nom)

  // Préfixe du matricule : ex "26FSILA" ou "26FSIl"
  const prefix = `${year}${sectionCode}${base}${lettre}`

  // Cherche le dernier numéro d'ordre pour cette classe
  const last = db.prepare(`
    SELECT numero_matricule FROM eleves
    WHERE classe_id = ? AND numero_matricule LIKE ?
    ORDER BY numero_matricule DESC
    LIMIT 1
  `).get(classeId, `${prefix}%`) as { numero_matricule: string } | undefined

  let nextNum = 1
  if (last) {
    const numPart = last.numero_matricule.replace(prefix, '')
    const parsed = parseInt(numPart)
    if (!isNaN(parsed)) nextNum = parsed + 1
  }

  // Génère le matricule et vérifie l'unicité
  let matricule = `${prefix}${String(nextNum).padStart(3, '0')}`
  while (db.prepare('SELECT id FROM eleves WHERE numero_matricule = ?').get(matricule)) {
    nextNum++
    matricule = `${prefix}${String(nextNum).padStart(3, '0')}`
  }

  return matricule
}

/**
 * Régénère le matricule d'un élève lors d'un transfert de classe
 * Sauvegarde l'ancien matricule dans academic_histories
 */
export function regenerateMatriculeOnTransfer(
  db: Database,
  ecoleId: string,
  eleveId: string,
  newClasseId: string
): string {
  const eleve = db.prepare(
    'SELECT annee_entree, numero_matricule FROM eleves WHERE id = ? AND ecole_id = ?'
  ).get(eleveId, ecoleId) as { annee_entree: string; numero_matricule: string } | undefined

  if (!eleve) throw new Error('Élève introuvable')

  const anneeArrivee = eleve.annee_entree
    ? parseInt(eleve.annee_entree)
    : new Date().getFullYear()

  const newMatricule = generateMatricule(db, ecoleId, newClasseId, anneeArrivee)

  return newMatricule
}
