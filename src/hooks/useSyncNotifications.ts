'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSchool } from '@/components/layout/SchoolProvider'
import { hasModuleAccess } from '@/lib/rbac'
import type { SyncNotificationItem } from '@/lib/sync-notifications'

type NotificationsPayload = {
  count: number
  items: SyncNotificationItem[]
  has_differences?: boolean
  checked_at?: string
  error?: string
}

const POLL_MS = 45_000

export function useSyncNotifications() {
  const { userRole } = useSchool()
  const canSync = hasModuleAccess(userRole, 'parametres')
  const [count, setCount] = useState(0)
  const [items, setItems] = useState<SyncNotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!canSync) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (!options?.silent) setLoading(true)
    try {
      const res = await fetch('/api/sync/notifications')
      const data = await res.json() as NotificationsPayload
      if (!res.ok) {
        setError(data.error ?? 'Erreur')
        setCount(0)
        setItems([])
        return
      }
      setError(null)
      setCount(data.count ?? 0)
      setItems(data.items ?? [])
      setLastChecked(data.checked_at ?? new Date().toISOString())
    } catch {
      setError('Erreur réseau')
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [canSync])

  useEffect(() => {
    if (!canSync) return
    void refresh({ silent: true })
    const id = window.setInterval(() => void refresh({ silent: true }), POLL_MS)
    return () => window.clearInterval(id)
  }, [canSync, refresh])

  return { count, items, loading, lastChecked, error, refresh, canSync }
}
