import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Check, Crown, Zap, Shield } from 'lucide-react'
import { LICENCE_PLANS, PLAN_PRICES, type LicencePlan } from '@/lib/licence-constants'

const PLAN_ICONS: Record<LicencePlan, typeof Shield> = {
  starter: Shield,
  standard: Zap,
  premium: Crown,
}

export default async function TarifsPage() {
  const t = await getTranslations('marketing.pricing')

  return (
    <div className="mk-container py-10 sm:py-16">
      <div className="text-center">
        <h1 className="mk-h2">{t('title')}</h1>
        <p className="mk-subtitle mx-auto max-w-2xl">{t('subtitle')}</p>
      </div>

      <div className="mt-8 grid gap-5 sm:mt-12 lg:grid-cols-3 lg:gap-6 lg:mt-14">
        {LICENCE_PLANS.map(plan => {
          const Icon = PLAN_ICONS[plan]
          const price = PLAN_PRICES[plan].toLocaleString('fr-FR')
          const features = t.raw(`plans.${plan}.features`) as string[]
          const isStandard = plan === 'standard'

          return (
            <article
              key={plan}
              className={`mk-card relative flex flex-col p-6 sm:p-8 ${isStandard ? 'mk-pricing-featured pt-8 sm:pt-10' : ''}`}
            >
              {isStandard && (
                <span className="mk-pricing-badge">{t('plans.standard.badge')}</span>
              )}
              <div className="mk-icon-box">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-bold sm:text-2xl" style={{ color: 'var(--mk-fg)' }}>
                {t(`plans.${plan}.name`)}
              </h2>
              <p className="mk-text-muted mt-1 text-sm">{t(`plans.${plan}.students`)}</p>
              <p className="mt-5 sm:mt-6">
                <span className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--mk-fg)' }}>
                  {price}
                </span>
                <span className="mk-text-faint ml-1 text-sm sm:text-base">
                  {t('currency')}{t('perYear')}
                </span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 sm:mt-8 sm:space-y-3">
                {features.map(f => (
                  <li key={f} className="flex gap-2 text-sm" style={{ color: 'var(--mk-fg-secondary)' }}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold sm:mt-8 ${
                  isStandard ? 'mk-btn-primary w-full' : 'mk-btn-secondary w-full'
                }`}
              >
                {t('cta')}
              </Link>
            </article>
          )
        })}
      </div>

      <p className="mk-text-muted mt-10 text-center text-sm sm:mt-12">
        {t('contact')}{' '}
        <Link href="/contact" className="mk-link">{t('contactCta')}</Link>
      </p>
    </div>
  )
}
