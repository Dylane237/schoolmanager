'use client'

import { useEffect, useRef } from 'react'
import { useSchool } from './SchoolProvider'

const SYNC_INTERVAL_MS = 2 * 60 * 1000

/** Sync automatique desktop : au retour en ligne, au démarrage et toutes les 2 min. */
export default function AutoDbSync() {
  const { slug } = useSchool()
  const syncing = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isDesktop = Boolean(
      (window as Window & { electronAPI?: unknown }).electronAPI,
    ) || ['localhost', '127.0.0.1'].includes(window.location.hostname)

    if (!isDesktop) return

    const runSync = async () => {
      if (!navigator.onLine || syncing.current) return
      syncing.current = true
      try {
        await fetch('/api/sync/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', slug }),
        })
      } catch {
        // hors ligne ou serveur indisponible
      } finally {
        syncing.current = false
      }
    }

    runSync()
    window.addEventListener('online', runSync)
    const interval = setInterval(runSync, SYNC_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', runSync)
      clearInterval(interval)
    }
  }, [slug])

  return null
}
