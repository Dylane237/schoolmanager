'use client'

import { useTranslations } from 'next-intl'
import {
  Users, Banknote, FileText, ClipboardCheck, UserCog, WifiOff,
  BarChart3, Shield, Smartphone,
} from 'lucide-react'

const FEATURES = [
  { key: 'students', icon: Users },
  { key: 'payments', icon: Banknote },
  { key: 'grades', icon: FileText },
  { key: 'attendance', icon: ClipboardCheck },
  { key: 'staff', icon: UserCog },
  { key: 'offline', icon: WifiOff },
  { key: 'analytics', icon: BarChart3 },
  { key: 'secure', icon: Shield },
  { key: 'mobile', icon: Smartphone },
] as const

export function MarketingFeatureGrid() {
  const t = useTranslations('marketing.features')

  return (
    <section id="features" className="mk-section scroll-mt-20 sm:scroll-mt-24">
      <div className="mk-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mk-h2">{t('title')}</h2>
          <p className="mk-subtitle">{t('subtitle')}</p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:mt-14">
          {FEATURES.map(({ key, icon: Icon }) => (
            <article key={key} className="mk-card mk-card-interactive p-5 sm:p-6">
              <div className="mk-icon-box mb-3 sm:mb-4">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold sm:text-base" style={{ color: 'var(--mk-fg)' }}>
                {t(`items.${key}.title`)}
              </h3>
              <p className="mk-text-muted mt-1.5 text-sm leading-relaxed sm:mt-2">
                {t(`items.${key}.desc`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
