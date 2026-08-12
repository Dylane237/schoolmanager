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
    <aside className="relative hidden lg:flex lg:w-[52%] xl:w-[50%] flex-col overflow-y-auto overflow-x-hidden border-r border-slate-800 bg-[#0f172a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_0%,rgba(16,185,129,0.12),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(45,212,191,0.06),transparent_50%)]" aria-hidden />

      <div className="relative z-10 flex min-h-full flex-col gap-6 p-8 xl:p-10">
        <header>
          <Link href="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
              <GraduationCap className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">
                School<span className="text-emerald-400">Manager</span>
              </span>
              <p className="text-[11px] text-slate-500">{t('tagline')}</p>
            </div>
          </Link>

          <h1 className="mt-8 text-[2rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[2.25rem]">
            {t('headline1')}
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {t('headline2')}
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-400">
            {t('heroBody')}
          </p>
        </header>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {t('whyUs')}
          </p>
          <AuthBadges variant="dark" layout="row" />
        </section>

        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {t('allInOne')}
          </p>
          <AuthFeatureList />
        </section>

        <section className="mt-auto pt-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <span className="shrink-0 text-[11px] font-medium text-emerald-500/80">
              {t('dashboardPreview')}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          </div>
          <AuthDashboardPreview variant="full" />
        </section>
      </div>
    </aside>
  )
}
