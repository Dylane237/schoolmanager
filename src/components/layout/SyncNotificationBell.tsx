'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, ChevronRight, Cloud, Laptop, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSyncNotifications } from '@/hooks/useSyncNotifications'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'
import { isElectronClient } from '@/lib/desktop-download'
import type { SyncNotificationItem } from '@/lib/sync-notifications'

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

type DetailProps = {
  item: SyncNotificationItem
  onClose: () => void
  onResolved: () => void
}

function NotificationDetail({ item, onClose, onResolved }: DetailProps) {
  const t = useTranslations('sync.notifications')
  const tChangelog = useTranslations('sync.changelog')
  const [applying, setApplying] = useState<'accept' | 'refuse' | null>(null)
  const isDesktop = isElectronClient()
  const herePlatform = isDesktop ? tChangelog('platformDesktop') : tChangelog('platformWeb')
  const otherPlatform = isDesktop ? tChangelog('platformWeb') : tChangelog('platformDesktop')

  const entityTypeLabel = (type: string) => {
    const labels = tChangelog.raw('entityTypes') as Record<string, string> | undefined
    return labels?.[type] ?? type
  }

  const applyDecision = async (choice: 'cloud' | 'local' | 'skip') => {
    setApplying(choice === 'skip' ? 'refuse' : 'accept')
    try {
      const res = await fetch('/api/sync/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisions: [{
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            choice,
          }],
        }),
      })
      const json = await res.json()
      if (!res.ok || (json.errors?.length && !json.applied)) {
        toast.error(json.errors?.[0] ?? t('actionError'))
        return
      }
      toast.success(choice === 'skip' ? t('refused') : t('accepted'))
      onResolved()
      onClose()
    } catch {
      toast.error(t('actionError'))
    } finally {
      setApplying(null)
    }
  }

  const kindLabel = item.kind === 'cloud_only'
    ? tChangelog('kindCloudOnly', { platform: otherPlatform })
    : tChangelog('kindBothModified')

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal
        aria-labelledby="notif-detail-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="min-w-0">
            <p id="notif-detail-title" className="font-semibold text-slate-900 truncate">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {entityTypeLabel(item.entity_type)} · {kindLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">{t('compareHint')}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <Laptop className="w-3.5 h-3.5" />
                {tChangelog('stateHere', { platform: herePlatform })}
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                {item.local_summary ?? t('emptySide')}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 p-3 bg-emerald-50/50">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-2">
                <Cloud className="w-3.5 h-3.5" />
                {tChangelog('stateOther', { platform: otherPlatform })}
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                {item.cloud_summary ?? t('emptySide')}
              </p>
            </div>
          </div>

          {item.fields_changed.length > 0 && (
            <p className="text-xs text-slate-500">
              {t('fieldsChanged', { fields: item.fields_changed.join(', ') })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            disabled={!!applying}
            onClick={() => void applyDecision('cloud')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {applying === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('acceptOther', { platform: otherPlatform })}
          </button>
          {item.kind === 'both_modified' && (
            <button
              type="button"
              disabled={!!applying}
              onClick={() => void applyDecision('local')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              {t('keepHere', { platform: herePlatform })}
            </button>
          )}
          <button
            type="button"
            disabled={!!applying}
            onClick={() => void applyDecision('skip')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 text-slate-500 px-4 py-2 text-sm font-medium hover:bg-slate-50 hover:text-slate-700 disabled:opacity-60 transition-colors ml-auto"
          >
            <X className="w-4 h-4" />
            {t('refuse')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SyncNotificationBell({ slug }: { slug: string }) {
  const t = useTranslations('sync.notifications')
  const tChangelog = useTranslations('sync.changelog')
  const { count, items, loading, refresh, canSync } = useSyncNotifications()
  const sync = useSyncStatusOptional()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SyncNotificationItem | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDesktop = isElectronClient()
  const otherPlatform = isDesktop ? tChangelog('platformWeb') : tChangelog('platformDesktop')

  const entityTypeLabel = useCallback((type: string) => {
    const labels = tChangelog.raw('entityTypes') as Record<string, string> | undefined
    return labels?.[type] ?? type
  }, [tChangelog])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (sync?.state === 'synced' && open) {
      void refresh({ silent: true })
    }
  }, [sync?.state, open, refresh])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!canSync) return null

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${
            open
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
          aria-label={t('ariaLabel', { count })}
          aria-expanded={open}
        >
          <BellIcon className="w-[18px] h-[18px]" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm ring-2 ring-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
          {loading && count === 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 animate-pulse ring-2 ring-white" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <p className="font-semibold text-slate-900 text-sm">{t('title')}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {count === 0 ? t('empty') : t('subtitle', { count, platform: otherPlatform })}
              </p>
            </div>

            <div className="max-h-[min(60vh,320px)] overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('loading')}
                </div>
              ) : items.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-sm text-slate-600">{t('allClear')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map(item => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <Cloud className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.label}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {entityTypeLabel(item.entity_type)}
                            {item.kind === 'both_modified' ? ` · ${t('conflict')}` : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
              >
                {loading ? t('refreshing') : t('refresh')}
              </button>
              <Link
                href={`/${slug}/donnees`}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                {t('viewAll')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <NotificationDetail
          item={selected}
          onClose={() => setSelected(null)}
          onResolved={() => {
            void refresh({ silent: true })
            sync?.refresh()
          }}
        />
      )}
    </>
  )
}
