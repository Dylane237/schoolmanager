'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'

const STATE_STYLES: Record<string, { dot: string; text: string }> = {
  synced: { dot: 'bg-emerald-400', text: 'text-emerald-300' },
  syncing: { dot: 'bg-blue-400 animate-pulse', text: 'text-blue-300' },
  pending: { dot: 'bg-amber-400', text: 'text-amber-300' },
  conflict: { dot: 'bg-orange-400 animate-pulse', text: 'text-orange-300' },
  error: { dot: 'bg-red-400', text: 'text-red-300' },
  offline: { dot: 'bg-slate-500', text: 'text-slate-400' },
}

export default function SyncStatusBadge({ slug }: { slug: string }) {
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
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium w-full"
      title={lastError ?? undefined}
    >
      {state === 'syncing' ? (
        <RefreshCw className="w-[18px] h-[18px] animate-spin shrink-0 text-blue-300" />
      ) : (
        <Icon className={`w-[18px] h-[18px] shrink-0 ${styles.text}`} />
      )}
      <span className="flex-1 text-left truncate">{t(labelKey)}</span>
      <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
    </Link>
  )
}
