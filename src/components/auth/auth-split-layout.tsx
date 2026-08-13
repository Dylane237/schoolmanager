'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { AuthLeftPanel } from './auth-left-panel'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

type AuthSplitLayoutProps = {
  mode: 'login' | 'register' | 'recover'
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}

export function AuthSplitLayout({ mode, title, subtitle, children, footer }: AuthSplitLayoutProps) {
  const t = useTranslations('auth')

  const alternate =
    mode === 'login'
      ? { href: '/register', label: t('createAccount') }
      : mode === 'register'
        ? { href: '/login', label: t('signInLink') }
        : { href: '/login', label: t('backToLogin') }

  return (
    <div className="auth-page">
      <AuthLeftPanel />

      <main className="auth-main">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.07),transparent)]"
          aria-hidden
        />

        <header className="auth-header">
          <div className="auth-header-brand md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 ring-1 ring-emerald-200">
              <GraduationCap className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
            </div>
            <span className="truncate text-base font-semibold text-gray-900">
              School<span className="text-emerald-600">Manager</span>
            </span>
          </div>

          <div className="auth-header-actions">
            <LanguageSwitcher variant="auth" />
            <Link href={alternate.href} className="auth-header-link">
              {mode !== 'login' && <ArrowLeft className="h-3.5 w-3.5 shrink-0" />}
              {alternate.label}
            </Link>
          </div>
        </header>

        <div className="auth-body">
          <div className="auth-form-wrap">
            <div className="auth-form-head">
              <h2 className="auth-form-title">{title}</h2>
              <p className="auth-form-subtitle">{subtitle}</p>
            </div>

            <div className="auth-form-card">{children}</div>

            <p className="auth-form-footer">{footer}</p>
          </div>
        </div>

        <footer className="auth-page-footer">
          {t('footer', { year: new Date().getFullYear() })}
        </footer>
      </main>
    </div>
  )
}
