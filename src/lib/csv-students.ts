export type StudentSection = 'francophone' | 'anglophone' | 'maternelle'

export interface ParsedStudentRow {
  line: number
  matricule?: string
  nom?: string
  prenom?: string
  sexe?: 'M' | 'F'
  classe?: string
  section?: StudentSection
  date_naissance?: string
  parent_nom?: string
  parent_telephone?: string
}

const SECTION_ALIASES: Record<string, StudentSection> = {
  francophone: 'francophone',
  fr: 'francophone',
  f: 'francophone',
  anglophone: 'anglophone',
  en: 'anglophone',
  anglais: 'anglophone',
  a: 'anglophone',
  maternelle: 'maternelle',
  m: 'maternelle',
}

export function normalizeSection(raw?: string): StudentSection | undefined {
  if (!raw?.trim()) return undefined
  return SECTION_ALIASES[raw.trim().toLowerCase()]
}

export function normalizeSexe(raw?: string): 'M' | 'F' | undefined {
  if (!raw?.trim()) return undefined
  const v = raw.trim().toUpperCase()
  if (v === 'M' || v === 'F') return v
  if (v.startsWith('M')) return 'M'
  if (v.startsWith('F')) return 'F'
  return undefined
}

function cleanCell(value: string): string {
  return value.trim().replace(/^"|"$/g, '')
}

function headerIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.includes(h))
}

export function parseStudentsCsv(text: string): ParsedStudentRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))

  const matIdx = headerIndex(headers, ['matricule', 'numero_matricule', 'n° matricule', 'numero'])
  const nomIdx = headerIndex(headers, ['nom', 'lastname', 'last_name'])
  const prenomIdx = headerIndex(headers, ['prenom', 'prénom', 'firstname', 'first_name'])
  const sexeIdx = headerIndex(headers, ['sexe', 'gender', 'sex'])
  const classeIdx = headerIndex(headers, ['classe', 'class', 'classe_nom'])
  const sectionIdx = headerIndex(headers, ['section'])
  const dobIdx = headerIndex(headers, ['date_naissance', 'date naissance', 'naissance', 'birthdate', 'dob'])
  const parentNomIdx = headerIndex(headers, ['parent_nom', 'parent nom', 'tuteur', 'guardian'])
  const parentTelIdx = headerIndex(headers, ['parent_telephone', 'telephone', 'téléphone', 'phone', 'tel'])

  const rows: ParsedStudentRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(cleanCell)
    if (cols.every(c => !c)) continue

    rows.push({
      line: i + 1,
      matricule: matIdx >= 0 ? cols[matIdx] || undefined : undefined,
      nom: nomIdx >= 0 ? cols[nomIdx] || undefined : undefined,
      prenom: prenomIdx >= 0 ? cols[prenomIdx] || undefined : undefined,
      sexe: sexeIdx >= 0 ? normalizeSexe(cols[sexeIdx]) : undefined,
      classe: classeIdx >= 0 ? cols[classeIdx] || undefined : undefined,
      section: sectionIdx >= 0 ? normalizeSection(cols[sectionIdx]) : undefined,
      date_naissance: dobIdx >= 0 ? cols[dobIdx] || undefined : undefined,
      parent_nom: parentNomIdx >= 0 ? cols[parentNomIdx] || undefined : undefined,
      parent_telephone: parentTelIdx >= 0 ? cols[parentTelIdx] || undefined : undefined,
    })
  }

  return rows
}

export const CSV_TEMPLATE =
  'matricule;nom;prenom;sexe;classe;section;date_naissance;parent_nom;parent_telephone\n' +
  ';MBALLA;Jean-Pierre;M;SIL A;francophone;2015-03-12;MBALLA Paul;699000000\n'
