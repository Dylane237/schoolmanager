'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type TopBarContextValue = {
  breadcrumb: string | null
  setBreadcrumb: (value: string | null) => void
}

const TopBarContext = createContext<TopBarContextValue | null>(null)

export function TopBarProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumb] = useState<string | null>(null)
  const value = useMemo(() => ({ breadcrumb, setBreadcrumb }), [breadcrumb])
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>
}

export function useTopBar() {
  const ctx = useContext(TopBarContext)
  if (!ctx) throw new Error('useTopBar must be used within TopBarProvider')
  return ctx
}

export function useTopBarOptional() {
  return useContext(TopBarContext)
}
