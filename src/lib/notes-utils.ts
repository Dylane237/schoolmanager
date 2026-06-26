export type NoteSection = 'francophone' | 'anglophone' | 'maternelle'

export function getNoteMax(section: string): number {
  return section === 'anglophone' ? 100 : 20
}

export function validateNote(note: number, section: string): string | null {
  const max = getNoteMax(section)
  if (Number.isNaN(note) || note < 0 || note > max) {
    return `La note doit être entre 0 et ${max}`
  }
  return null
}

export function getMentionFrancophone(note: number) {
  if (note >= 16) return { label: 'Très Bien', color: 'text-emerald-600' }
  if (note >= 14) return { label: 'Bien', color: 'text-blue-600' }
  if (note >= 12) return { label: 'Assez Bien', color: 'text-blue-500' }
  if (note >= 10) return { label: 'Passable', color: 'text-amber-600' }
  return { label: 'Insuffisant', color: 'text-red-600' }
}

export function getGradeAnglophone(note: number) {
  if (note >= 90) return { label: 'A', color: 'text-emerald-600' }
  if (note >= 80) return { label: 'B', color: 'text-blue-600' }
  if (note >= 70) return { label: 'C', color: 'text-blue-500' }
  if (note >= 60) return { label: 'D', color: 'text-amber-600' }
  return { label: 'F', color: 'text-red-600' }
}

export function getMention(note: number, section: string) {
  return section === 'anglophone'
    ? getGradeAnglophone(note)
    : getMentionFrancophone(note)
}

export function formatMoyenne(moyenne: number, section: string): string {
  const max = getNoteMax(section)
  return `${moyenne.toFixed(2)}/${max}`
}
