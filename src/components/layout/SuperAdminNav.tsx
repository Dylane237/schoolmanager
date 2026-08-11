'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/super-admin/dashboard' },
  { label: 'Écoles', href: '/super-admin/ecoles' },
  { label: 'Licences cloud', href: 'https://schoolmanager-eosin.vercel.app/admin-licences', external: true },
]

export default function SuperAdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(item => {
        const active = !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`))
        const className = `px-4 py-2 rounded-lg text-base transition-colors ${
          active
            ? 'bg-slate-800 text-white font-medium'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {item.label} ↗
            </a>
          )
        }
        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
