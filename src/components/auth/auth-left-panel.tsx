'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { GraduationCap, WifiOff, Receipt, ShieldCheck } from 'lucide-react'

const HIGHLIGHTS = [
  { id: 'offline', icon: WifiOff },
  { id: 'receipts', icon: Receipt },
  { id: 'local', icon: ShieldCheck },
] as const

export function AuthLeftPanel() {
  const t = useTranslations('auth.marketing')
  const tb = useTranslations('auth.marketing.badges')

  return (
    <aside className="auth-left-panel">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_0%,rgba(16,185,129,0.12),transparent_55%)]" aria-hidden />

      <div className="auth-left-inner">
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

          <h2 className="mt-6 text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[2rem]">
            {t('headline1')}
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {t('headline2')}
            </span>
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-400">
            {t('heroBody')}
          </p>
        </header>

        <div className="auth-left-highlights">
          {HIGHLIGHTS.map(({ id, icon: Icon }) => (
            <span key={id} className="auth-left-highlight">
              <Icon strokeWidth={2} />
              {tb(`${id}.label`)}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
