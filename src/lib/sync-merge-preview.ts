import type { MergeChoice } from './sync-merge'
import type { SyncDiffItem } from './sync-diff-types'

export type MergePreviewLine = {
  entity_type: string
  entity_id: string
  label: string
  choice: MergeChoice
  desktop_will: string
  web_will: string
  severity: 'info' | 'warn' | 'loss'
  blocked?: boolean
}

export type MergePreviewReport = {
  lines: MergePreviewLine[]
  desktop_losses: number
  web_losses: number
  will_push: number
  will_import: number
  blocked: number
}

function itemKey(item: SyncDiffItem): string {
  return `${item.entity_type}:${item.entity_id}`
}

/** Prévisualise les conséquences des choix de fusion avant application. */
export function computeMergePreview(
  items: SyncDiffItem[],
  choices: Record<string, MergeChoice>,
  allowDestructive = false,
): MergePreviewReport {
  const lines: MergePreviewLine[] = []
  let desktop_losses = 0
  let web_losses = 0
  let will_push = 0
  let will_import = 0
  let blocked = 0

  for (const item of items) {
    const choice = choices[itemKey(item)] ?? 'skip'
    const line = previewOne(item, choice, allowDestructive)
    lines.push(line)
    if (line.blocked) blocked += 1
    if (line.severity === 'loss') {
      if (line.desktop_will.includes('perdra') || line.desktop_will.includes('supprim')) desktop_losses += 1
      if (line.web_will.includes('perdra') || line.web_will.includes('écras')) web_losses += 1
    }
    if (line.desktop_will.includes('recevra') || line.desktop_will.includes('import')) will_import += 1
    if (line.web_will.includes('recevra') || line.web_will.includes('écras')) will_push += 1
  }

  return { lines, desktop_losses, web_losses, will_push, will_import, blocked }
}

function previewOne(
  item: SyncDiffItem,
  choice: MergeChoice,
  allowDestructive: boolean,
): MergePreviewLine {
  const base = {
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    label: item.label,
    choice,
  }

  if (choice === 'skip') {
    return {
      ...base,
      desktop_will: 'Aucun changement sur le bureau',
      web_will: 'Aucun changement sur le web',
      severity: 'info',
    }
  }

  if (choice === 'local') {
    if (item.kind === 'local_only') {
      return {
        ...base,
        desktop_will: 'Conservé sur le bureau',
        web_will: 'Recevra cette donnée à la prochaine synchronisation blob',
        severity: 'info',
      }
    }
    if (item.kind === 'cloud_only') {
      return {
        ...base,
        desktop_will: 'N\'importera pas la version web (donnée absente du bureau)',
        web_will: 'Inchangé — la donnée web reste sans équivalent bureau',
        severity: 'warn',
      }
    }
    return {
      ...base,
      desktop_will: 'Conservera sa version actuelle',
      web_will: allowDestructive
        ? 'Sera écrasé par la version bureau'
        : 'Recevra la version bureau (mise à jour, mode additif)',
      severity: allowDestructive ? 'warn' : 'info',
    }
  }

  // choice === 'cloud'
  if (item.kind === 'local_only') {
    if (!allowDestructive) {
      return {
        ...base,
        desktop_will: 'Conservé — mode additif (aucune suppression)',
        web_will: 'Inchangé — activez « Autoriser suppressions » pour écraser',
        severity: 'info',
        blocked: true,
      }
    }
    return {
      ...base,
      desktop_will: 'Perdra cette entrée (supprimée du bureau)',
      web_will: 'Ne recevra pas cette donnée (absente du cloud)',
      severity: 'loss',
    }
  }
  if (item.kind === 'cloud_only') {
    return {
      ...base,
      desktop_will: 'Recevra l\'entrée depuis le web (ajout/import)',
      web_will: 'Conservé tel quel',
      severity: 'info',
    }
  }
  return {
    ...base,
    desktop_will: 'Sera remplacé par la version web (cette fiche uniquement)',
    web_will: 'Conservé tel quel',
    severity: 'warn',
  }
}
