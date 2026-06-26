'use client'

import { createContext, useContext } from 'react'

export interface SchoolContextValue {
  slug: string
  ecoleNom: string
  anneeScolaire: string
  licenceType: string | null
  userInitials: string
  userNom: string
  userRole: string
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

export function SchoolProvider({
  value,
  children,
}: {
  value: SchoolContextValue
  children: React.ReactNode
}) {
  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider')
  return ctx
}
