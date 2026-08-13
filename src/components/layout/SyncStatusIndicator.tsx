'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'

type Variant = 'sidebar' | 'topbar'

const SIDEBAR_STYLES: Record<string, { dot: string; text: string }> = {
  synced: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  syncing: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-300' },
  pending: { dot: 'bg-amber-400', text: 'text-amber-300' },
  conflict: { dot: 'bg-orange-400 animate-pulse', text: 'text-orange-300' },
  error: { dot: 'bg-red-400', text: 'text-red-300' },
  offline: { dot: 'bg-slate-500', text: 'text-slate-400' },
}

const TOPBAR_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  synced: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  syncing: { dot: 'bg-blue-500 animate-pulse', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  conflict: { dot: 'bg-orange-500 animate-pulse', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  error: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  offline: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
}

export default function SyncStatusIndicator({
  slug,
  variant = 'topbar',
}: {
  slug: string
  variant?: Variant
}) {
  const t = useTranslations('sync')
  const sync = useSyncStatusOptional()
  if (!sync) return null

  const { state, lastError } = sync
  const labelKey = `state.${state}` as 'state.synced'
  const Icon = state === 'offline' ? CloudOff : state === 'conflict' ? AlertTriangle : Cloud
  const spinning = state === 'syncing'

  if (variant === 'sidebar') {
    const styles = SIDEBAR_STYLES[state] ?? SIDEBAR_STYLES.pending
    return (
      <Link
        href={`/${slug}/donnees`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium w-full"
        title={lastError ?? undefined}
      >
        {spinning ? (
          <RefreshCw className="w-[18px] h-[18px] animate-spin shrink-0 text-blue-300" />
        ) : (
          <Icon className={`w-[18px] h-[18px] shrink-0 ${styles.text}`} />
        )}
        <span className="flex-1 text-left truncate">{t(labelKey)}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
      </Link>
    )
  }

  const styles = TOPBAR_STYLES[state] ?? TOPBAR_STYLES.pending
  return (
    <Link
      href={`/${slug}/donnees`}
      title={lastError ?? undefined}
      className={`hidden md:inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90 ${styles.bg} ${styles.text}`}
    >
      {spinning ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="max-w-[120px] truncate">{t(labelKey)}</span>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
    </Link>
  )
}
