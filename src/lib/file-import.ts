import * as XLSX from 'xlsx'
import { parseStudentsCsv, normalizeSection, type ParsedStudentRow } from './csv-students'

export type ImportFileKind = 'csv' | 'xlsx' | 'json' | 'unknown'

const JSON_FIELD_MAP: Record<string, keyof ParsedStudentRow> = {
  matricule: 'matricule',
  numero_matricule: 'matricule',
  nom: 'nom',
  lastname: 'nom',
  last_name: 'nom',
  prenom: 'prenom',
  prénom: 'prenom',
  firstname: 'prenom',
  first_name: 'prenom',
  sexe: 'sexe',
  gender: 'sexe',
  classe: 'classe',
  class: 'classe',
  section: 'section',
  date_naissance: 'date_naissance',
  birthdate: 'date_naissance',
  dob: 'date_naissance',
  parent_nom: 'parent_nom',
  parent_telephone: 'parent_telephone',
  telephone: 'parent_telephone',
  phone: 'parent_telephone',
}

function detectKind(filename: string, mime: string): ImportFileKind {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
    return 'xlsx'
  }
  if (lower.endsWith('.json') || mime.includes('json')) return 'json'
  if (lower.endsWith('.csv') || lower.endsWith('.txt') || mime.includes('csv') || mime.includes('text')) {
    return 'csv'
  }
  return 'unknown'
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_')
}

function mapJsonRecord(record: Record<string, unknown>, line: number): ParsedStudentRow {
  const row: ParsedStudentRow = { line }
  for (const [rawKey, value] of Object.entries(record)) {
    const mapped = JSON_FIELD_MAP[normalizeKey(rawKey)]
    if (!mapped || value === null || value === undefined) continue
    const str = String(value).trim()
    if (!str) continue
    if (mapped === 'sexe') {
      const s = str.toUpperCase()
      if (s === 'M' || s === 'F') row.sexe = s
    } else if (mapped === 'section') {
      row.section = normalizeSection(str)
    } else if (mapped === 'matricule') row.matricule = str
    else if (mapped === 'nom') row.nom = str
    else if (mapped === 'prenom') row.prenom = str
    else if (mapped === 'classe') row.classe = str
    else if (mapped === 'date_naissance') row.date_naissance = str
    else if (mapped === 'parent_nom') row.parent_nom = str
    else if (mapped === 'parent_telephone') row.parent_telephone = str
  }
  return row
}

function parseJsonStudents(text: string): ParsedStudentRow[] {
  const parsed = JSON.parse(text) as unknown
  let records: Record<string, unknown>[]

  if (Array.isArray(parsed)) {
    records = parsed as Record<string, unknown>[]
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown[] }).data)) {
    records = (parsed as { data: Record<string, unknown>[] }).data
  } else {
    throw new Error('JSON invalide : attendu un tableau ou { data: [...] }')
  }

  return records.map((r, i) => mapJsonRecord(r, i + 2))
}

function xlsxToCsvText(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return ''
  return XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { FS: ';' })
}

export function parseStudentImportFile(
  buffer: ArrayBuffer,
  filename: string,
  mime = ''
): { kind: ImportFileKind; rows: ParsedStudentRow[]; csvText: string } {
  const kind = detectKind(filename, mime)

  if (kind === 'xlsx') {
    const csvText = xlsxToCsvText(buffer)
    return { kind, csvText, rows: parseStudentsCsv(csvText) }
  }

  const text = new TextDecoder('utf-8').decode(buffer)

  if (kind === 'json') {
    const rows = parseJsonStudents(text)
    const csvText = rowsToCsv(rows)
    return { kind, rows, csvText }
  }

  if (kind === 'csv' || kind === 'unknown') {
    return { kind: kind === 'unknown' ? 'csv' : kind, csvText: text, rows: parseStudentsCsv(text) }
  }

  throw new Error('Format de fichier non supporté')
}

function rowsToCsv(rows: ParsedStudentRow[]): string {
  const header = 'matricule;nom;prenom;sexe;classe;section;date_naissance;parent_nom;parent_telephone'
  const lines = rows.map(r =>
    [
      r.matricule ?? '',
      r.nom ?? '',
      r.prenom ?? '',
      r.sexe ?? '',
      r.classe ?? '',
      r.section ?? '',
      r.date_naissance ?? '',
      r.parent_nom ?? '',
      r.parent_telephone ?? '',
    ].join(';')
  )
  return [header, ...lines].join('\n')
}

export const SUPPORTED_IMPORT_EXTENSIONS = ['.csv', '.txt', '.xlsx', '.xls', '.json']
export const SUPPORTED_IMPORT_MIMES =
  'text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
