'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { GraduationCap, Menu, X } from 'lucide-react'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { MarketingThemeToggle } from '@/components/marketing/MarketingThemeToggle'

const NAV = [
  { href: '/#features', key: 'features' as const, match: 'features' },
  { href: '/#pricing', key: 'pricing' as const, match: 'pricing' },
  { href: '/telecharger', key: 'download' as const, match: 'telecharger' },
  { href: '/contact', key: 'contact' as const, match: 'contact' },
]

export function MarketingHeader() {
  const t = useTranslations('marketing')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (match: string) =>
    match === 'features' || match === 'pricing'
      ? pathname === '/'
      : pathname.startsWith(`/${match}`)

  return (
    <header className="mk-header">
      <div className="mk-container flex h-14 items-center justify-between gap-3 sm:h-16">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/20 sm:h-9 sm:w-9">
            <GraduationCap className="h-4 w-4 text-white sm:h-5 sm:w-5" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold sm:text-base" style={{ color: 'var(--mk-fg)' }}>
            School<span className="text-emerald-500">Manager</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`mk-nav-link ${isActive(item.match) ? 'mk-nav-link-active' : ''}`}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <MarketingThemeToggle />
          <LanguageSwitcher variant="auth" />
          <Link href="/login" className="mk-btn-ghost">
            {t('nav.login')}
          </Link>
          <Link href="/register" className="mk-btn-primary px-4 py-2 text-sm">
            {t('nav.register')}
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <MarketingThemeToggle />
          <button
            type="button"
            className="mk-theme-toggle"
            onClick={() => setOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t px-4 py-4 md:hidden" style={{ borderColor: 'var(--mk-border)' }}>
          <nav className="flex flex-col gap-0.5">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="mk-nav-link px-3 py-2.5"
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
            <div
              className="mt-3 flex flex-col gap-2 border-t pt-3"
              style={{ borderColor: 'var(--mk-border)' }}
            >
              <LanguageSwitcher variant="auth" />
              <Link href="/login" className="mk-btn-secondary w-full text-center text-sm">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="mk-btn-primary w-full text-center text-sm">
                {t('nav.register')}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
