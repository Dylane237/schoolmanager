'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, CreditCard, School,
  BookOpen, FileText, CheckSquare, Sprout, UserCheck,
  Settings, LogOut, Megaphone, ClipboardList,
  Menu, X, Sun, Moon, Database,
} from 'lucide-react'
import { useSchool } from './SchoolProvider'
import { hasModuleAccess, NAV_MODULE_MAP, type Module } from '@/lib/rbac'
import { useTheme } from '@/components/providers/ThemeProvider'
import LicenceSidebarButton from './LicenceSidebarButton'
import SyncStatusBadge from './SyncStatusBadge'
import SchoolLogoMark from './SchoolLogoMark'
import NavIcon from '@/components/ui/NavIcon'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { setLastLoginEmail } from '@/lib/last-login-email'

interface SidebarProps {
  slug: string
  ecoleNom?: string
}

const NAV_GROUPS = (slug: string, t: ReturnType<typeof useTranslations<'nav'>>) => [
  {
    label: null,
    items: [
      { key: 'dashboard', labelKey: 'items.dashboard' as const, icon: LayoutDashboard, href: `/${slug}/dashboard`, match: 'exact' as const },
    ]
  },
  {
    labelKey: 'groups.schooling' as const,
    items: [
      { key: 'eleves', labelKey: 'items.students' as const, icon: Users, href: `/${slug}/eleves`, match: 'prefix' as const },
      { key: 'classes', labelKey: 'items.classes' as const, icon: School, href: `/${slug}/classes`, match: 'prefix' as const },
      { key: 'presences', labelKey: 'items.attendance' as const, icon: CheckSquare, href: `/${slug}/presences`, match: 'prefix' as const },
      { key: 'maternelle', labelKey: 'items.nursery' as const, icon: Sprout, href: `/${slug}/maternelle`, match: 'prefix' as const },
    ]
  },
  {
    labelKey: 'groups.finance' as const,
    items: [
      { key: 'paiements', labelKey: 'items.payments' as const, icon: CreditCard, href: `/${slug}/paiements`, match: 'prefix' as const },
    ]
  },
  {
    labelKey: 'groups.pedagogy' as const,
    items: [
      { key: 'notes/saisie', labelKey: 'items.gradesEntry' as const, icon: ClipboardList, href: `/${slug}/notes/saisie`, match: 'prefix' as const },
      { key: 'notes/bulletins', labelKey: 'items.reportCards' as const, icon: FileText, href: `/${slug}/notes/bulletins`, match: 'prefix' as const },
    ]
  },
  {
    labelKey: 'groups.admin' as const,
    items: [
      { key: 'personnel', labelKey: 'items.staff' as const, icon: UserCheck, href: `/${slug}/personnel`, match: 'prefix' as const },
      { key: 'annonces', labelKey: 'items.announcements' as const, icon: Megaphone, href: `/${slug}/annonces`, match: 'prefix' as const },
      { key: 'donnees', labelKey: 'items.data' as const, icon: Database, href: `/${slug}/donnees`, match: 'prefix' as const },
      { key: 'parametres', labelKey: 'items.settings' as const, icon: Settings, href: `/${slug}/parametres`, match: 'prefix' as const },
    ]
  },
]

function isActive(pathname: string, href: string, match: string) {
  if (match === 'exact') return pathname === href
  return pathname.startsWith(href)
}

export default function Sidebar({ slug, ecoleNom }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const { userRole } = useSchool()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const showLicence = hasModuleAccess(userRole, 'parametres')

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.email) setLastLoginEmail(data.email)
    }
    router.push('/login')
  }

  const navContent = (
    <>
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <SchoolLogoMark size="xl" />
          <div className="leading-tight min-w-0">
            <span className="text-white font-bold text-base block truncate">{ecoleNom || 'SchoolManager'}</span>
            <span className="text-emerald-400/90 text-xs font-medium tracking-wide">{tCommon('schoolManagement')}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {NAV_GROUPS(slug, t).map((group, gi) => {
          const visibleItems = group.items.filter(item => {
            const navModule = NAV_MODULE_MAP[item.key] as Module
            return hasModuleAccess(userRole, navModule)
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={gi}>
              {group.labelKey && (
                <p className="px-3.5 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {t(group.labelKey)}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = isActive(pathname, item.href, item.match)
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[15px] font-medium ${
                        active
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <NavIcon icon={item.icon} active={active} />
                      {t(item.labelKey)}
                    </a>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-700/50 space-y-1">
        {showLicence && <SyncStatusBadge slug={slug} />}
        {showLicence && <LicenceSidebarButton />}
        <LanguageSwitcher />
        <button
          onClick={toggleTheme}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-[15px] font-medium w-full"
        >
          <NavIcon icon={theme === 'dark' ? Sun : Moon} />
          {theme === 'dark' ? t('lightMode') : t('darkMode')}
        </button>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-[15px] font-medium w-full"
        >
          <NavIcon icon={LogOut} />
          {t('logout')}
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
        aria-label={t('openMenu')}
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
          aria-label={t('closeMenu')}
        >
          <X className="w-5 h-5" />
        </button>
        {navContent}
      </aside>
    </>
  )
}
