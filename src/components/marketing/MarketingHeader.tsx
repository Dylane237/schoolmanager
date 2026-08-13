'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { GraduationCap } from 'lucide-react'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { MarketingThemeToggle } from '@/components/marketing/MarketingThemeToggle'

const NAV = [
  { href: '/', key: 'home' as const, match: 'home' },
  { href: '/#pricing', key: 'pricing' as const, match: 'pricing' },
  { href: '/telecharger', key: 'download' as const, match: 'telecharger' },
  { href: '/contact', key: 'contact' as const, match: 'contact' },
] as const

export function MarketingHeader() {
  const t = useTranslations('marketing')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (match: string) => {
    if (match === 'home') return pathname === '/'
    if (match === 'pricing') return pathname === '/tarifs'
    return pathname.startsWith(`/${match}`)
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <header className="mk-header">
        <div className="mk-header-inner">
          <Link href="/" className="mk-brand" onClick={() => setOpen(false)}>
            <span className="mk-brand-mark" aria-hidden>
              <GraduationCap className="h-[18px] w-[18px] text-white" strokeWidth={2} />
            </span>
            <span className="mk-brand-name">
              School<span className="mk-brand-accent">Manager</span>
            </span>
          </Link>

          <nav className="mk-nav-desktop" aria-label={t('nav.ariaMain')}>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`mk-nav-desktop-link ${isActive(item.match) ? 'is-active' : ''}`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}
          </nav>

          <div className="mk-header-end">
            <div className="mk-header-cta">
              <Link href="/login" className="mk-nav-desktop-link mk-header-login">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="mk-btn-nav-cta">
                {t('nav.register')}
              </Link>
            </div>

            <div className="mk-header-utils">
              <MarketingThemeToggle />
              <LanguageSwitcher variant="marketing" />
            </div>

            <button
              type="button"
              className={`mk-burger ${open ? 'is-open' : ''}`}
              onClick={() => setOpen(v => !v)}
              aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={open}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mk-mobile-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav className="mk-mobile-drawer-nav" aria-label={t('nav.ariaMain')}>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="mk-mobile-drawer-link"
              onClick={() => setOpen(false)}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>
        <div className="mk-mobile-drawer-footer">
          <Link href="/login" className="mk-btn-outline w-full" onClick={() => setOpen(false)}>
            {t('nav.login')}
          </Link>
          <Link href="/register" className="mk-btn-primary w-full" onClick={() => setOpen(false)}>
            {t('nav.register')}
          </Link>
        </div>
      </div>
    </>
  )
}
