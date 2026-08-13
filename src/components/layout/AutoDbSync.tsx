'use client'

import { useEffect, useRef } from 'react'
import { useSchool } from './SchoolProvider'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'

const SYNC_INTERVAL_MS = 2 * 60 * 1000

/** Sync automatique desktop : au retour en ligne, au démarrage et toutes les 2 min. */
export default function AutoDbSync() {
  const { slug } = useSchool()
  const sync = useSyncStatusOptional()
  const syncing = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !sync) return

    const isDesktop = Boolean(
      (window as Window & { electronAPI?: unknown }).electronAPI,
    ) || ['localhost', '127.0.0.1'].includes(window.location.hostname)

    if (!isDesktop) return

    const runSync = async () => {
      if (!navigator.onLine || syncing.current) return
      syncing.current = true
      sync.setSyncing(true)
      try {
        const statusRes = await fetch('/api/sync/db')
        if (!statusRes.ok) return
        const status = await statusRes.json() as {
          hasConflict?: boolean
          cloudAhead?: boolean
          localDirty?: boolean
        }

        if (status.hasConflict) return

        if (status.cloudAhead && !status.localDirty) {
          await sync.runSync('keep_cloud', { silent: true, allowDestructive: true })
        } else if (status.localDirty && !status.cloudAhead) {
          await sync.runSync('keep_local', { silent: true, allowDestructive: true })
        } else if (!status.localDirty && !status.cloudAhead) {
          return
        } else {
          await sync.runSync(undefined, { silent: true })
        }
      } finally {
        syncing.current = false
        await sync.refresh()
      }
    }

    runSync()
    window.addEventListener('online', runSync)
    const interval = setInterval(runSync, SYNC_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', runSync)
      clearInterval(interval)
    }
  }, [slug, sync])

  return null
}
