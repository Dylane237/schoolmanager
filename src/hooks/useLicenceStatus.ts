'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LicencePlan } from '@/lib/licence-constants'

export interface LicenceStatus {
  active: boolean
  plan: LicencePlan | null
  planLabel: string | null
  planPrice: number | null
  dateDebut: string | null
  dateFin: string | null
  daysLeft: number | null
  studentCount: number
  studentLimit: number | null
  usagePercent: number | null
  cleMasked: string | null
}

export function useLicenceStatus() {
  const [status, setStatus] = useState<LicenceStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/licence/status')
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { status, loading, refresh }
}
