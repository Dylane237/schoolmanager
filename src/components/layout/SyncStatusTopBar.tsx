'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'

const STATE_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  synced: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  syncing: { dot: 'bg-blue-500 animate-pulse', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  conflict: { dot: 'bg-orange-500 animate-pulse', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  error: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  offline: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
}

export default function SyncStatusTopBar({ slug }: { slug: string }) {
  const t = useTranslations('sync')
  const sync = useSyncStatusOptional()
  if (!sync) return null

  const { state, lastError } = sync
  const styles = STATE_STYLES[state] ?? STATE_STYLES.pending
  const Icon = state === 'offline' ? CloudOff : state === 'conflict' ? AlertTriangle : Cloud
  const labelKey = `state.${state}` as 'state.synced'

  return (
    <Link
      href={`/${slug}/donnees`}
      title={lastError ?? undefined}
      className={`hidden md:inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90 ${styles.bg} ${styles.text}`}
    >
      {state === 'syncing' ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="max-w-[120px] truncate">{t(labelKey)}</span>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
    </Link>
  )
}
