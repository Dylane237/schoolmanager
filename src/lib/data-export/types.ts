export type ExportEntity =
  | 'eleves'
  | 'classes'
  | 'paiements'
  | 'notes'
  | 'presences'
  | 'personnel'

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf'

export interface ExportColumn {
  key: string
  label: string
}

export interface ExportDataset {
  entity: ExportEntity
  title: string
  columns: ExportColumn[]
  rows: Record<string, unknown>[]
  exportedAt: string
  ecoleNom: string
}

export const EXPORT_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'json', 'pdf']

export const ENTITY_MODULES: Record<ExportEntity, import('../rbac').Module> = {
  eleves: 'eleves',
  classes: 'classes',
  paiements: 'paiements',
  notes: 'notes',
  presences: 'presences',
  personnel: 'personnel',
}
