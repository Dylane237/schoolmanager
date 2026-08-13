'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { GraduationCap } from 'lucide-react'
import { AuthBadges } from './auth-badges'
import { AuthFeatureList } from './auth-feature-list'
import { AuthDashboardPreview } from './auth-dashboard-preview'

export function AuthLeftPanel() {
  const t = useTranslations('auth.marketing')

  return (
    <aside className="auth-left-panel">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_0%,rgba(16,185,129,0.12),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(45,212,191,0.06),transparent_50%)]" aria-hidden />

      <div className="auth-left-inner relative z-10 flex min-h-full flex-col gap-5 p-6 lg:gap-6 lg:p-8 xl:p-10">
        <header>
          <Link href="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
              <GraduationCap className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-white">
                School<span className="text-emerald-400">Manager</span>
              </span>
              <p className="text-[11px] text-slate-500">{t('tagline')}</p>
            </div>
          </Link>

          <h1 className="auth-left-headline mt-6 text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white lg:mt-8 lg:text-[2rem] xl:text-[2.25rem]">
            {t('headline1')}
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {t('headline2')}
            </span>
          </h1>
          <p className="auth-left-body mt-3 max-w-lg text-[14px] leading-relaxed text-slate-400 lg:mt-4 lg:text-[15px]">
            {t('heroBody')}
          </p>
        </header>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {t('whyUs')}
          </p>
          <AuthBadges variant="dark" layout="stack" />
        </section>

        <section className="auth-left-features">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {t('allInOne')}
          </p>
          <AuthFeatureList />
        </section>

        <section className="auth-left-preview mt-auto pt-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <span className="shrink-0 text-[11px] font-medium text-emerald-500/80">
              {t('dashboardPreview')}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          </div>
          <AuthDashboardPreview variant="full" className="auth-left-preview-frame" />
        </section>
      </div>
    </aside>
  )
}
