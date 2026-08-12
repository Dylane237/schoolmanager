import { describe, it, expect } from 'vitest'
import { computeMergePreview } from '../src/lib/sync-merge-preview'
import { parseTrancheKey } from '../src/lib/sync-diff-blob'
import type { SyncDiffItem } from '../src/lib/sync-diff-types'

describe('computeMergePreview', () => {
  const item: SyncDiffItem = {
    entity_type: 'paiement',
    entity_id: 'p1',
    label: 'Paiement 5000 F',
    kind: 'local_only',
    local_summary: '5000 F',
    cloud_summary: null,
    fields_changed: [],
  }

  it('prévient la perte bureau si cloud choisi sur local_only', () => {
    const preview = computeMergePreview([item], { 'paiement:p1': 'cloud' })
    expect(preview.desktop_losses).toBeGreaterThan(0)
    expect(preview.lines[0].desktop_will).toContain('Perdra')
  })

  it('prévient push web si local choisi sur local_only', () => {
    const preview = computeMergePreview([item], { 'paiement:p1': 'local' })
    expect(preview.lines[0].web_will).toContain('Recevra')
  })
})

describe('parseTrancheKey', () => {
  it('parse une clé tranche composite', () => {
    expect(parseTrancheKey('cls1:2:2025-2026')).toEqual({
      classe_id: 'cls1',
      tranche_numero: 2,
      annee_scolaire: '2025-2026',
    })
  })
})
