'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, Cloud, Laptop, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { isElectronClient } from '@/lib/desktop-download'
import { computeMergePreview } from '@/lib/sync-merge-preview'
import type { SyncDiffItem } from '@/lib/sync-diff-types'
import type { SyncChangeEntry } from '@/lib/sync-changelog'

type ChangelogPayload = {
  conflict: boolean
  diff: {
    has_differences: boolean
    items: SyncDiffItem[]
    summary: { local_only: number; cloud_only: number; both_modified: number }
  }
  journal: {
    desktop: SyncChangeEntry[]
    web: SyncChangeEntry[]
  }
}

export type { ChangelogPayload }

type MergeChoice = 'local' | 'cloud' | 'skip'

export default function SyncConflictPanel({
  onResolved,
  compareKey = 0,
  comparePayload = null,
}: {
  onResolved?: () => void
  compareKey?: number
  comparePayload?: ChangelogPayload | null
}) {
  const t = useTranslations('sync.changelog')
  const [data, setData] = useState<ChangelogPayload | null>(null)
  const [merging, setMerging] = useState(false)
  const [choices, setChoices] = useState<Record<string, MergeChoice>>({})
  const [allowDestructive, setAllowDestructive] = useState(false)
  const [showComparedEmpty, setShowComparedEmpty] = useState(false)

  const isDesktop = isElectronClient()
  const herePlatform = isDesktop ? t('platformDesktop') : t('platformWeb')
  const otherPlatform = isDesktop ? t('platformWeb') : t('platformDesktop')

  const entityTypeLabel = useCallback((type: string) => {
    const labels = t.raw('entityTypes') as Record<string, string> | undefined
    return labels?.[type] ?? type
  }, [t])

  const applyPayload = useCallback((json: ChangelogPayload, fromCompare: boolean) => {
    setData(json)
    setShowComparedEmpty(fromCompare && !json.diff?.has_differences && !json.conflict)
    const defaults: Record<string, MergeChoice> = {}
    for (const item of json.diff?.items ?? []) {
      const key = `${item.entity_type}:${item.entity_id}`
      if (item.kind === 'local_only') defaults[key] = 'local'
      else if (item.kind === 'cloud_only') defaults[key] = 'cloud'
      else defaults[key] = 'local'
    }
    setChoices(defaults)
  }, [])

  useEffect(() => {
    if (compareKey > 0 && comparePayload) {
      applyPayload(comparePayload, true)
    }
  }, [compareKey, comparePayload, applyPayload])

  const setChoice = (item: SyncDiffItem, choice: MergeChoice) => {
    const key = `${item.entity_type}:${item.entity_id}`
    setChoices(prev => ({ ...prev, [key]: choice }))
  }

  const preview = useMemo(() => {
    if (!data?.diff.items.length) return null
    return computeMergePreview(data.diff.items, choices, allowDestructive)
  }, [data?.diff.items, choices, allowDestructive])

  const refreshCompare = async (): Promise<ChangelogPayload | null> => {
    const res = await fetch('/api/sync/compare', { method: 'POST' })
    if (!res.ok) return null
    const json = await res.json() as ChangelogPayload
    applyPayload(json, true)
    return json
  }

  const applyMerge = async () => {
    setMerging(true)
    try {
      const fresh = await refreshCompare()
      if (!fresh) {
        toast.error(t('mergeError'))
        return
      }

      const items = fresh.diff?.items ?? []
      if (!items.length) {
        toast.success(t('alreadySynced'))
        onResolved?.()
        return
      }

      const freshChoices = { ...choices }
      for (const item of items) {
        const key = `${item.entity_type}:${item.entity_id}`
        if (!(key in freshChoices)) {
          freshChoices[key] = item.kind === 'local_only' ? 'local'
            : item.kind === 'cloud_only' ? 'cloud'
            : 'local'
        }
      }

      const decisions = items
        .map(item => ({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          choice: freshChoices[`${item.entity_type}:${item.entity_id}`] ?? 'skip',
        }))
        .filter(d => d.choice !== 'skip')

      if (!decisions.length) {
        toast.error(t('nothingToApply'))
        return
      }

      const previewFresh = computeMergePreview(items, freshChoices, allowDestructive)
      if (previewFresh.desktop_losses > 0) {
        const ok = window.confirm(t('confirmLosses', { count: previewFresh.desktop_losses }))
        if (!ok) return
      }

      const res = await fetch('/api/sync/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions, allow_destructive: allowDestructive }),
      })
      const json = await res.json()
      const hasHardErrors = json.errors?.length > 0
      if (!res.ok || (hasHardErrors && !json.applied)) {
        toast.error(json.errors?.[0] ?? t('mergeError'))
      } else {
        const msg = json.blocked > 0
          ? t('mergePartial', { applied: json.applied ?? 0, blocked: json.blocked })
          : t('mergeSuccess', { count: json.applied ?? 0 })
        toast.success(msg)
        await refreshCompare()
        onResolved?.()
      }
    } catch {
      toast.error(t('mergeError'))
    } finally {
      setMerging(false)
    }
  }

  // Panneau affiché uniquement après « Synchroniser maintenant »
  if (compareKey === 0 || !comparePayload) return null

  if (showComparedEmpty) {
    return (
      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
        {t('allSynced')}
      </div>
    )
  }

  if (!data?.diff.has_differences && !data?.conflict) return null

  const kindLabel = (kind: SyncDiffItem['kind']) => {
    if (kind === 'local_only') return t('kindLocalOnly', { platform: herePlatform })
    if (kind === 'cloud_only') return t('kindCloudOnly', { platform: otherPlatform })
    return t('kindBothModified')
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">{t('title')}</p>
            <p className="text-sm text-amber-800 mt-1">{t('subtitleCompare')}</p>
            <p className="text-xs text-emerald-700 mt-1 font-medium">{t('additiveMode')}</p>
            <p className="text-xs text-amber-700 mt-2">
              {t('summary', {
                local: data.diff.summary.local_only,
                cloud: data.diff.summary.cloud_only,
                both: data.diff.summary.both_modified,
                here: herePlatform,
                other: otherPlatform,
              })}
            </p>
          </div>
        </div>
      </div>

      {data.diff.items.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide flex flex-wrap items-center justify-between gap-2">
            <span>{t('diffTitle')}</span>
            <label className="normal-case font-normal flex items-center gap-1.5 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDestructive}
                onChange={e => setAllowDestructive(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t('allowDestructive')}
            </label>
          </div>
          <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {data.diff.items.map(item => {
              const key = `${item.entity_type}:${item.entity_id}`
              const choice = choices[key] ?? 'skip'
              return (
                <li key={key} className="p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 mr-1">
                          {entityTypeLabel(item.entity_type)}
                        </span>
                        {kindLabel(item.kind)}
                        {item.fields_changed.length > 0 && ` · ${item.fields_changed.join(', ')}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <ChoiceButton active={choice === 'local'} onClick={() => setChoice(item, 'local')}>
                        {t('keepHere', { platform: herePlatform })}
                      </ChoiceButton>
                      <ChoiceButton
                        active={choice === 'cloud'}
                        disabled={item.kind === 'local_only' && !allowDestructive}
                        onClick={() => setChoice(item, 'cloud')}
                      >
                        {t('keepOther', { platform: otherPlatform })}
                      </ChoiceButton>
                      <ChoiceButton active={choice === 'skip'} onClick={() => setChoice(item, 'skip')}>
                        {t('skip')}
                      </ChoiceButton>
                    </div>
                  </div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                    {item.local_summary && (
                      <p className="p-2 bg-blue-50 text-blue-900 rounded">
                        <span className="font-medium inline-flex items-center gap-1">
                          {isDesktop ? <Laptop className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                          {t('stateHere', { platform: herePlatform })}:
                        </span>{' '}
                        {item.local_summary}
                      </p>
                    )}
                    {item.cloud_summary && (
                      <p className="p-2 bg-emerald-50 text-emerald-900 rounded">
                        <span className="font-medium inline-flex items-center gap-1">
                          {isDesktop ? <Cloud className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                          {t('stateOther', { platform: otherPlatform })}:
                        </span>{' '}
                        {item.cloud_summary}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {preview && preview.lines.some(l => l.choice !== 'skip') && (
            <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {t('previewTitle')}
              </p>
              {(preview.desktop_losses > 0 || preview.web_losses > 0) && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  {t('previewWarning', {
                    desktop: preview.desktop_losses,
                    web: preview.web_losses,
                  })}
                </p>
              )}
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {preview.lines.filter(l => l.choice !== 'skip').map(line => (
                  <li key={`${line.entity_type}:${line.entity_id}`} className="text-xs bg-white rounded p-2 border border-slate-200">
                    <p className="font-medium text-slate-800">{line.label}</p>
                    <p className="text-slate-600 mt-1">
                      {isDesktop ? <Laptop className="w-3 h-3 inline mr-1" /> : <Cloud className="w-3 h-3 inline mr-1" />}
                      {line.desktop_will}
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      {isDesktop ? <Cloud className="w-3 h-3 inline mr-1" /> : <Laptop className="w-3 h-3 inline mr-1" />}
                      {line.web_will}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => void applyMerge()}
              disabled={merging}
              className="btn-primary text-sm w-full sm:w-auto"
            >
              {merging ? t('merging') : t('applyMerge')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChoiceButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 rounded text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-slate-800 text-white border-slate-800'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  )
}
