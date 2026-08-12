'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

const NAV_ITEMS = [
  { labelKey: 'dashboard' as const, href: '/super-admin/dashboard' },
  { labelKey: 'schools' as const, href: '/super-admin/ecoles' },
  { labelKey: 'licences' as const, href: 'https://schoolmanager-eosin.vercel.app/admin-licences', external: true },
]

export default function SuperAdminNav() {
  const pathname = usePathname()
  const t = useTranslations('superAdmin.nav')

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(item => {
        const active = !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`))
        const className = `px-4 py-2 rounded-lg text-base transition-colors ${
          active
            ? 'bg-slate-800 text-white font-medium'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
        const label = `${t(item.labelKey)}${item.external ? ' ↗' : ''}`
        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {label}
            </a>
          )
        }
        return (
          <Link key={item.href} href={item.href} className={className}>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
