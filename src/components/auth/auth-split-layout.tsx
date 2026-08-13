'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { AuthLeftPanel } from './auth-left-panel'
import { AuthBadges } from './auth-badges'
import { AuthDashboardPreview } from './auth-dashboard-preview'
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

        <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-2.5 md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 ring-1 ring-emerald-200">
              <GraduationCap className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
            </div>
            <span className="truncate text-base font-semibold text-gray-900">
              School<span className="text-emerald-600">Manager</span>
            </span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="auth" />
            <Link
              href={alternate.href}
              className="flex items-center gap-1.5 text-[13px] text-gray-500 transition-colors hover:text-gray-800"
            >
              {mode !== 'login' && <ArrowLeft className="h-3.5 w-3.5 shrink-0" />}
              {alternate.label}
            </Link>
          </div>
        </header>

        <div className="relative z-10 shrink-0 space-y-4 px-4 pb-2 md:hidden">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">{t('mobileHeroTitle')}</h2>
            <p className="mt-1 text-[13px] text-gray-500">{t('mobileHeroSubtitle')}</p>
          </div>
          <AuthBadges variant="light" layout="stack" />
          <div className="mx-auto max-w-md">
            <AuthDashboardPreview variant="compact" />
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 lg:px-10">
          <div className="auth-form-wrap">
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500 sm:text-[14px]">{subtitle}</p>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm shadow-gray-200/50 sm:p-6">
              {children}
            </div>

            <p className="mt-5 text-center text-[13px] text-gray-500 sm:mt-6">{footer}</p>
          </div>
        </div>

        <footer className="relative z-10 shrink-0 px-4 py-4 text-center text-[12px] text-gray-400 sm:px-6 md:px-8 lg:px-10">
          {t('footer', { year: new Date().getFullYear() })}
        </footer>
      </main>
    </div>
  )
}
