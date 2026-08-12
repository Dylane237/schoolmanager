'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSchool } from '@/components/layout/SchoolProvider'
import { hasModuleAccess } from '@/lib/rbac'
import toast from 'react-hot-toast'

export type SyncState = 'synced' | 'syncing' | 'pending' | 'conflict' | 'error' | 'offline'

type SyncStatusPayload = {
  sync_state?: SyncState
  conflict?: boolean
  last_error?: string | null
  last_sync_at?: string | null
  synced_at?: string | null
  db_synced?: boolean
}

type SyncStatusContextValue = {
  state: SyncState
  lastError: string | null
  lastSyncAt: string | null
  refresh: () => Promise<void>
  runSync: (strategy?: 'keep_local' | 'keep_cloud', options?: { silent?: boolean; allowDestructive?: boolean }) => Promise<boolean>
  setSyncing: (syncing: boolean) => void
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null)

const POLL_MS = 30_000

/** Évite les toasts en double (AutoDbSync + sync manuelle) pour un même conflit. */
let conflictToastShown = false

function notifySyncConflict(silent?: boolean) {
  if (silent || conflictToastShown) return
  conflictToastShown = true
  toast.error('Conflit de sync — choisissez quelle version garder dans Données', {
    id: 'sync-conflict',
  })
}

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const { slug, userRole } = useSchool()
  const canSync = hasModuleAccess(userRole, 'parametres')
  const [state, setState] = useState<SyncState>('pending')
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const applyPayload = useCallback((data: SyncStatusPayload) => {
    if (data.conflict || data.sync_state === 'conflict') setState('conflict')
    else if (data.last_error || data.sync_state === 'error') setState('error')
    else if (data.sync_state === 'synced' || data.db_synced) {
      conflictToastShown = false
      setState('synced')
    }
    else setState('pending')
    setLastError(data.last_error ?? null)
    setLastSyncAt(data.last_sync_at ?? data.synced_at ?? null)
  }, [])

  const refresh = useCallback(async () => {
    if (!canSync) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState('offline')
      return
    }
    try {
      const res = await fetch('/api/sync/status')
      if (!res.ok) return
      applyPayload(await res.json())
    } catch {
      setState('offline')
    }
  }, [applyPayload, canSync])

  const runSync = useCallback(async (
    strategy?: 'keep_local' | 'keep_cloud',
    options?: { silent?: boolean; allowDestructive?: boolean },
  ) => {
    if (!canSync) return false
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState('offline')
      return false
    }

    setState('syncing')
    try {
      const res = await fetch('/api/sync/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategy
          ? { strategy, allow_destructive: options?.allowDestructive === true }
          : {}),
      })
      const data = await res.json()

      if (res.status === 409) {
        setState('conflict')
        setLastError(data.error ?? 'Conflit de synchronisation')
        notifySyncConflict(options?.silent)
        return false
      }

      if (!res.ok) {
        setState('error')
        setLastError(data.error ?? 'Sync échouée')
        toast.error(data.error ?? 'Synchronisation échouée')
        return false
      }

      applyPayload({ sync_state: 'synced', last_sync_at: data.synced_at, db_synced: true })
      return true
    } catch {
      setState('offline')
      return false
    }
  }, [applyPayload, canSync])

  const setSyncing = useCallback((syncing: boolean) => {
    if (syncing) setState('syncing')
  }, [])

  useEffect(() => {
    if (!canSync) return
    const bootstrap = window.setTimeout(() => { void refresh() }, 0)
    const interval = setInterval(refresh, POLL_MS)
    const onOnline = () => refresh()
    window.addEventListener('online', onOnline)
    return () => {
      clearTimeout(bootstrap)
      clearInterval(interval)
      window.removeEventListener('online', onOnline)
    }
  }, [canSync, refresh, slug])

  const value = useMemo(
    () => ({ state, lastError, lastSyncAt, refresh, runSync, setSyncing }),
    [state, lastError, lastSyncAt, refresh, runSync, setSyncing],
  )

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  )
}

export function useSyncStatus() {
  const ctx = useContext(SyncStatusContext)
  if (!ctx) {
    throw new Error('useSyncStatus must be used within SyncStatusProvider')
  }
  return ctx
}

export function useSyncStatusOptional() {
  return useContext(SyncStatusContext)
}
