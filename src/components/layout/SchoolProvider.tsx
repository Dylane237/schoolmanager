'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export interface SchoolContextValue {
  slug: string
  ecoleNom: string
  anneeScolaire: string
  licenceType: string | null
  licenceFin: string | null
  logoUrl: string | null
  userInitials: string
  userNom: string
  userRole: string
  setLogoUrl: (url: string | null) => void
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

type SchoolProviderProps = {
  value: Omit<SchoolContextValue, 'setLogoUrl'>
  children: React.ReactNode
}

export function SchoolProvider({ value, children }: SchoolProviderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(value.logoUrl)

  useEffect(() => {
    setLogoUrl(value.logoUrl)
  }, [value.logoUrl])

  return (
    <SchoolContext.Provider value={{ ...value, logoUrl, setLogoUrl }}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider')
  return ctx
}
