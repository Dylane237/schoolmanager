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
      <div className="mk-container mk-header-inner">
        <Link href="/" className="mk-brand shrink-0">
          <span className="mk-brand-mark" aria-hidden>
            <GraduationCap className="h-[18px] w-[18px] text-white" strokeWidth={2} />
          </span>
          <span className="mk-brand-name">
            School<span className="text-emerald-600">Manager</span>
          </span>
        </Link>

        <nav className="mk-nav hidden lg:flex" aria-label={t('nav.ariaMain')}>
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

        <div className="mk-header-actions hidden lg:flex">
          <MarketingThemeToggle />
          <LanguageSwitcher variant="marketing" />
          <span className="mk-header-divider" aria-hidden />
          <Link href="/login" className="mk-nav-link mk-nav-link-login">
            {t('nav.login')}
          </Link>
          <Link href="/register" className="mk-btn-header-cta">
            {t('nav.register')}
          </Link>
        </div>

        <div className="mk-header-mobile ml-auto flex items-center gap-1.5 lg:hidden">
          <Link href="/register" className="mk-btn-header-cta-mobile">
            {t('nav.registerShort')}
          </Link>
          <MarketingThemeToggle />
          <button
            type="button"
            className="mk-theme-toggle"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t lg:hidden" style={{ borderColor: 'var(--mk-border)' }}>
          <div className="mk-container py-4">
            <nav className="flex flex-col gap-1" aria-label={t('nav.ariaMain')}>
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="mk-mobile-nav-link"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
            </nav>
            <div
              className="mt-4 flex flex-col gap-3 border-t pt-4"
              style={{ borderColor: 'var(--mk-border)' }}
            >
              <LanguageSwitcher variant="marketing" />
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mk-btn-secondary w-full text-center text-sm"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="mk-btn-primary w-full text-center text-sm"
              >
                {t('nav.register')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
