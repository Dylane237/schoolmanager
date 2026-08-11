import type { SmartFilterPreset } from '@/hooks/useSmartFilters'

export const ELEVE_PRESETS: SmartFilterPreset[] = [
  { id: 'impayes', label: 'Impayés', values: { statut: 'impaye' } },
  { id: 'partiels', label: 'Paiement partiel', values: { statut: 'partiel' } },
  { id: 'soldes', label: 'Soldés', values: { statut: 'paye' } },
  { id: 'sans_classe', label: 'Sans classe', values: { classe: '__none__' } },
]

export const PAIEMENT_SITUATION_PRESETS: SmartFilterPreset[] = [
  { id: 'impayes', label: 'Impayés', values: { statut: 'impaye' } },
  { id: 'partiels', label: 'Partiels', values: { statut: 'partiel' } },
  { id: 'soldes', label: 'Soldés', values: { statut: 'paye' } },
  { id: 'retard', label: 'Non configurés', values: { statut: 'non_configure' } },
]

export const PRESENCE_DATE_PRESETS = [
  { label: "Aujourd'hui", offset: 0 },
  { label: 'Hier', offset: -1 },
  { label: 'Avant-hier', offset: -2 },
] as const

export function dateWithOffset(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

export const SECTION_OPTIONS = [
  { value: '', label: 'Toutes les sections' },
  { value: 'francophone', label: 'Francophone' },
  { value: 'anglophone', label: 'Anglophone' },
  { value: 'maternelle', label: 'Maternelle' },
]

export const STATUT_PAIEMENT_OPTIONS = [
  { value: 'tous', label: 'Tous les paiements' },
  { value: 'paye', label: 'Soldé' },
  { value: 'partiel', label: 'Partiel' },
  { value: 'impaye', label: 'Impayé' },
]

export const STATUT_SITUATION_OPTIONS = [
  { value: 'tous', label: 'Tous les élèves' },
  { value: 'impaye', label: 'Impayés' },
  { value: 'partiel', label: 'Paiement partiel' },
  { value: 'paye', label: 'Soldés' },
  { value: 'non_configure', label: 'Non configurés' },
]

export const MODE_PAIEMENT_OPTIONS = [
  { value: '', label: 'Tous les modes' },
  { value: 'especes', label: 'Espèces' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'virement', label: 'Virement' },
]
