'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { studentFilterPatch, type StudentContext } from '@/lib/student-context-links'

export function useStudentDeepLink(
  setFilters: (patch: Record<string, string>) => void,
  options?: {
    apply?: (student: StudentContext) => Record<string, string>
  },
) {
  const searchParams = useSearchParams()
  const appliedRef = useRef<string | null>(null)
  const applyRef = useRef(options?.apply)
  applyRef.current = options?.apply
  const [student, setStudent] = useState<StudentContext | null>(null)

  const eleveId = searchParams.get('eleve_id')

  useEffect(() => {
    if (!eleveId || appliedRef.current === eleveId) return

    appliedRef.current = eleveId
    fetch(`/api/eleves/${eleveId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data?.eleve) return
        const e = data.eleve
        const ctx: StudentContext = {
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          numero_matricule: e.numero_matricule,
          classe_id: e.classe_id,
          section: e.section || e.classe_section,
        }
        setStudent(ctx)
        setFilters(applyRef.current?.(ctx) ?? studentFilterPatch(ctx))
      })
  }, [eleveId, setFilters])

  return { student, eleveId }
}
