import type { Section } from '@/types'

export interface NiveauRef {
  code: string
  label: string
  /** Nom de classe suggéré (ex. CM2, Class 3) */
  nomDefaut: string
}

export interface CycleRef {
  nom: string
  niveaux: NiveauRef[]
}

export interface SectionRef {
  id: Section
  label: string
  description: string
  cycles: CycleRef[]
}

/** Référentiel officiel des niveaux scolaires au Cameroun */
export const CAMEROON_SECTIONS: SectionRef[] = [
  {
    id: 'francophone',
    label: 'Francophone',
    description: 'Système éducatif francophone (MINESEC)',
    cycles: [
      {
        nom: 'Primaire',
        niveaux: [
          { code: 'SIL', label: 'Section d\'Initiation au Langage', nomDefaut: 'SIL' },
          { code: 'CP', label: 'Cours Préparatoire', nomDefaut: 'CP' },
          { code: 'CE1', label: 'Cours Élémentaire 1', nomDefaut: 'CE1' },
          { code: 'CE2', label: 'Cours Élémentaire 2', nomDefaut: 'CE2' },
          { code: 'CM1', label: 'Cours Moyen 1', nomDefaut: 'CM1' },
          { code: 'CM2', label: 'Cours Moyen 2', nomDefaut: 'CM2' },
        ],
      },
      {
        nom: 'Secondaire — Collège',
        niveaux: [
          { code: '6EME', label: 'Sixième', nomDefaut: '6ème' },
          { code: '5EME', label: 'Cinquième', nomDefaut: '5ème' },
          { code: '4EME', label: 'Quatrième', nomDefaut: '4ème' },
          { code: '3EME', label: 'Troisième', nomDefaut: '3ème' },
        ],
      },
      {
        nom: 'Secondaire — Lycée',
        niveaux: [
          { code: '2NDE', label: 'Seconde', nomDefaut: '2nde' },
          { code: '1ERE', label: 'Première', nomDefaut: '1ère' },
          { code: 'TLE', label: 'Terminale', nomDefaut: 'Tle' },
        ],
      },
    ],
  },
  {
    id: 'anglophone',
    label: 'Anglophone',
    description: 'Système éducatif anglophone (GCE)',
    cycles: [
      {
        nom: 'Nursery',
        niveaux: [
          { code: 'N1', label: 'Nursery 1', nomDefaut: 'Nursery 1' },
          { code: 'N2', label: 'Nursery 2', nomDefaut: 'Nursery 2' },
          { code: 'N3', label: 'Nursery 3', nomDefaut: 'Nursery 3' },
        ],
      },
      {
        nom: 'Primary',
        niveaux: [
          { code: 'C1', label: 'Class 1', nomDefaut: 'Class 1' },
          { code: 'C2', label: 'Class 2', nomDefaut: 'Class 2' },
          { code: 'C3', label: 'Class 3', nomDefaut: 'Class 3' },
          { code: 'C4', label: 'Class 4', nomDefaut: 'Class 4' },
          { code: 'C5', label: 'Class 5', nomDefaut: 'Class 5' },
          { code: 'C6', label: 'Class 6', nomDefaut: 'Class 6' },
        ],
      },
      {
        nom: 'Secondary',
        niveaux: [
          { code: 'F1', label: 'Form 1', nomDefaut: 'Form 1' },
          { code: 'F2', label: 'Form 2', nomDefaut: 'Form 2' },
          { code: 'F3', label: 'Form 3', nomDefaut: 'Form 3' },
          { code: 'F4', label: 'Form 4', nomDefaut: 'Form 4' },
          { code: 'F5', label: 'Form 5', nomDefaut: 'Form 5' },
          { code: 'L6', label: 'Lower Sixth', nomDefaut: 'Lower Sixth' },
          { code: 'U6', label: 'Upper Sixth', nomDefaut: 'Upper Sixth' },
        ],
      },
    ],
  },
  {
    id: 'maternelle',
    label: 'Maternelle',
    description: 'Petite, moyenne et grande section',
    cycles: [
      {
        nom: 'Sections maternelles',
        niveaux: [
          { code: 'PS', label: 'Petite Section (3-4 ans)', nomDefaut: 'Petite Section' },
          { code: 'MS', label: 'Moyenne Section (4-5 ans)', nomDefaut: 'Moyenne Section' },
          { code: 'GS', label: 'Grande Section (5-6 ans)', nomDefaut: 'Grande Section' },
        ],
      },
    ],
  },
]

export function getSectionRef(section: Section): SectionRef | undefined {
  return CAMEROON_SECTIONS.find(s => s.id === section)
}

export function getAllNiveauxForSection(section: Section): NiveauRef[] {
  const ref = getSectionRef(section)
  if (!ref) return []
  return ref.cycles.flatMap(c => c.niveaux)
}

export function findNiveau(section: Section, codeOrNom: string): NiveauRef | undefined {
  return getAllNiveauxForSection(section).find(
    n => n.code === codeOrNom || n.nomDefaut === codeOrNom || n.label === codeOrNom,
  )
}

/** Ordre d'affichage des sections */
export const SECTION_ORDER: Section[] = ['maternelle', 'francophone', 'anglophone']

export function sectionLabel(section: string): string {
  return getSectionRef(section as Section)?.label ?? section
}
