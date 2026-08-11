import { describe, it, expect } from 'vitest'
import {
  validateNote,
  getNoteMax,
  getMentionFrancophone,
  getGradeAnglophone,
  formatMoyenne,
} from '@/lib/notes-utils'

describe('notes-utils / bulletins', () => {
  it('getNoteMax francophone vs anglophone', () => {
    expect(getNoteMax('francophone')).toBe(20)
    expect(getNoteMax('anglophone')).toBe(100)
  })

  it('validateNote francophone', () => {
    expect(validateNote(15, 'francophone')).toBeNull()
    expect(validateNote(21, 'francophone')).toMatch(/0 et 20/)
    expect(validateNote(-1, 'francophone')).toMatch(/0 et 20/)
  })

  it('validateNote anglophone', () => {
    expect(validateNote(85, 'anglophone')).toBeNull()
    expect(validateNote(101, 'anglophone')).toMatch(/0 et 100/)
  })

  it('mentions francophones', () => {
    expect(getMentionFrancophone(17).label).toBe('Très Bien')
    expect(getMentionFrancophone(8).label).toBe('Insuffisant')
  })

  it('grades anglophones', () => {
    expect(getGradeAnglophone(92).label).toBe('A')
    expect(getGradeAnglophone(55).label).toBe('F')
  })

  it('formatMoyenne', () => {
    expect(formatMoyenne(14.567, 'francophone')).toBe('14.57/20')
    expect(formatMoyenne(78.2, 'anglophone')).toBe('78.20/100')
  })
})
