'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
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

type LicenceStatusContextValue = {
  status: LicenceStatus | null
  loading: boolean
  refresh: () => Promise<void>
}

const LicenceStatusContext = createContext<LicenceStatusContextValue | null>(null)

export function LicenceStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenceStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/licence/status', { cache: 'no-store' })
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <LicenceStatusContext.Provider value={{ status, loading, refresh }}>
      {children}
    </LicenceStatusContext.Provider>
  )
}

export function useLicenceStatus() {
  const ctx = useContext(LicenceStatusContext)
  if (!ctx) {
    throw new Error('useLicenceStatus must be used within LicenceStatusProvider')
  }
  return ctx
}
