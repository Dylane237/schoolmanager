'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/super-admin/dashboard' },
  { label: 'Écoles', href: '/super-admin/ecoles' },
  { label: 'Licences', href: '/super-admin/licences' },
]

export default function SuperAdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(item => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-lg text-base transition-colors ${
              active
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
