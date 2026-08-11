'use client'

import { useEffect, useState } from 'react'

export interface ClasseOption {
  id: string
  nom: string
  section: string
  nb_eleves?: number
}

export function useClasses() {
  const [classes, setClasses] = useState<ClasseOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/classes')
      .then(r => r.json())
      .then(d => setClasses(d.classes || []))
      .finally(() => setLoading(false))
  }, [])

  const bySection = (section: string) =>
    section ? classes.filter(c => c.section === section) : classes

  return { classes, loading, bySection }
}
