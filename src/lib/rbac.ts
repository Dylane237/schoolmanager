import type { Role } from '@/types'

export type Module =
  | 'dashboard'
  | 'eleves'
  | 'paiements'
  | 'classes'
  | 'notes'
  | 'bulletins'
  | 'presences'
  | 'maternelle'
  | 'personnel'
  | 'annonces'
  | 'parametres'

const ROLE_MODULES: Record<Role, Module[] | '*'> = {
  super_admin: '*',
  admin: '*',
  comptable: ['dashboard', 'eleves', 'paiements'],
  secretaire: ['dashboard', 'eleves', 'classes', 'presences', 'annonces'],
  enseignant: ['dashboard', 'notes', 'bulletins', 'presences', 'maternelle'],
  parent: [],
}

const MODULE_API_PREFIX: Record<Module, string[]> = {
  dashboard: [],
  eleves: ['/api/eleves', '/api/upload'],
  paiements: ['/api/paiements', '/api/tranches-config', '/api/frais-examens'],
  classes: ['/api/classes', '/api/matieres'],
  notes: ['/api/notes', '/api/bulletins'],
  bulletins: ['/api/bulletins'],
  presences: ['/api/presences'],
  maternelle: ['/api/maternelle'],
  personnel: ['/api/personnel'],
  annonces: ['/api/annonces'],
  parametres: ['/api/ecole', '/api/annees-scolaires', '/api/backup', '/api/tranches-config', '/api/users', '/api/licence', '/api/audit'],
}

export function hasModuleAccess(role: string, module: Module): boolean {
  const access = ROLE_MODULES[role as Role]
  if (!access) return false
  if (access === '*') return true
  return access.includes(module)
}

export function getAccessibleModules(role: string): Module[] {
  const access = ROLE_MODULES[role as Role]
  if (!access || access === '*') {
    return Object.keys(MODULE_API_PREFIX) as Module[]
  }
  return access
}

export function canWriteModule(role: string, module: Module): boolean {
  if (role === 'super_admin' || role === 'admin') return true
  if (role === 'comptable') return module === 'paiements' || module === 'eleves'
  if (role === 'secretaire') return ['eleves', 'presences', 'annonces', 'classes'].includes(module)
  if (role === 'enseignant') return ['notes', 'presences', 'maternelle'].includes(module)
  return false
}

export function getModuleForPagePath(pathname: string, slug: string): Module | null {
  const base = `/${slug}/`
  if (!pathname.startsWith(base)) return null
  const rest = pathname.slice(base.length)

  if (rest.startsWith('notes/saisie')) return 'notes'
  if (rest.startsWith('notes/bulletins')) return 'bulletins'
  if (rest.startsWith('classes/')) return 'classes'
  if (rest.startsWith('eleves/')) return 'eleves'
  if (rest.startsWith('paiements/')) return 'paiements'
  if (rest === 'licence' || rest.startsWith('licence/')) return 'parametres'

  const first = rest.split('/')[0]
  const map: Record<string, Module> = {
    dashboard: 'dashboard',
    eleves: 'eleves',
    paiements: 'paiements',
    classes: 'classes',
    presences: 'presences',
    maternelle: 'maternelle',
    personnel: 'personnel',
    annonces: 'annonces',
    parametres: 'parametres',
  }
  return map[first] ?? null
}

export function getModuleForApiPath(pathname: string): Module | null {
  for (const [module, prefixes] of Object.entries(MODULE_API_PREFIX) as [Module, string[]][]) {
    if (prefixes.some(p => pathname.startsWith(p))) return module
  }
  return null
}

export const NAV_MODULE_MAP: Record<string, Module> = {
  dashboard: 'dashboard',
  eleves: 'eleves',
  paiements: 'paiements',
  classes: 'classes',
  'notes/saisie': 'notes',
  'notes/bulletins': 'bulletins',
  presences: 'presences',
  maternelle: 'maternelle',
  personnel: 'personnel',
  annonces: 'annonces',
  licence: 'parametres',
  parametres: 'parametres',
}
