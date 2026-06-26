'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, School,
  BookOpen, FileText, CheckSquare, Sprout, UserCheck,
  Settings, LogOut, GraduationCap, Megaphone, ClipboardList,
  Menu, X, Sun, Moon, ArrowRightLeft,
} from 'lucide-react'
import { useSchool } from './SchoolProvider'
import { hasModuleAccess, NAV_MODULE_MAP, type Module } from '@/lib/rbac'
import { useTheme } from '@/components/providers/ThemeProvider'

interface SidebarProps {
  slug: string
  ecoleNom?: string
  licenceFin?: string
}

const ALL_NAV_ITEMS = (slug: string) => [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, href: `/${slug}/dashboard`, match: 'exact' as const },
  { key: 'eleves', label: 'Élèves', icon: Users, href: `/${slug}/eleves`, match: 'prefix' as const },
  { key: 'paiements', label: 'Paiements', icon: CreditCard, href: `/${slug}/paiements`, match: 'prefix' as const },
  { key: 'classes', label: 'Classes', icon: School, href: `/${slug}/classes`, match: 'prefix' as const },
  { key: 'notes/saisie', label: 'Saisie notes', icon: ClipboardList, href: `/${slug}/notes/saisie`, match: 'prefix' as const },
  { key: 'notes/bulletins', label: 'Bulletins', icon: FileText, href: `/${slug}/notes/bulletins`, match: 'prefix' as const },
  { key: 'presences', label: 'Présences', icon: CheckSquare, href: `/${slug}/presences`, match: 'prefix' as const },
  { key: 'maternelle', label: 'Maternelle', icon: Sprout, href: `/${slug}/maternelle`, match: 'prefix' as const },
  { key: 'personnel', label: 'Personnel', icon: UserCheck, href: `/${slug}/personnel`, match: 'prefix' as const },
  { key: 'annonces', label: 'Annonces', icon: Megaphone, href: `/${slug}/annonces`, match: 'prefix' as const },
  { key: 'parametres', label: 'Paramètres', icon: Settings, href: `/${slug}/parametres`, match: 'prefix' as const },
]

function isActive(pathname: string, href: string, match: string) {
  if (match === 'exact') return pathname === href
  return pathname.startsWith(href)
}

export default function Sidebar({ slug, ecoleNom, licenceFin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { userRole } = useSchool()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = ALL_NAV_ITEMS(slug).filter(item => {
    const module = NAV_MODULE_MAP[item.key] as Module
    return hasModuleAccess(userRole, module)
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const daysLeft = licenceFin
    ? Math.floor((new Date(licenceFin).getTime() - Date.now()) / 86400000)
    : null

  const navContent = (
    <>
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight min-w-0">
            <span className="text-white font-bold text-base block truncate">{ecoleNom || 'SchoolManager'}</span>
            <span className="text-emerald-400 text-sm">Gestion scolaire</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.match)
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-[15px] font-medium ${
                active
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.25 : 2} />
              {item.label}
            </a>
          )
        })}
      </nav>

      {licenceFin && daysLeft !== null && daysLeft <= 30 && (
        <div className="mx-3 mb-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-semibold text-amber-400">Licence</p>
          <p className="text-sm text-amber-200/80 mt-0.5">
            {daysLeft <= 0 ? 'Expirée' : `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      <div className="p-3 border-t border-slate-700/50 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-[15px] font-medium w-full"
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-[15px] font-medium w-full"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[272px] bg-slate-900 flex flex-col h-full shrink-0 border-r border-slate-800 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
        {navContent}
      </aside>
    </>
  )
}
