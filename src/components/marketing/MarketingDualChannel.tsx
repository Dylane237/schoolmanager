import { getTranslations } from 'next-intl/server'
import { Monitor, Cloud, Smartphone, CheckCircle2 } from 'lucide-react'

export async function MarketingDualChannel() {
  const t = await getTranslations('marketing.dualChannel')
  const steps = ['1', '2', '3'] as const

  return (
    <section className="mk-section mk-band">
      <div className="mk-container">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <p className="mk-eyebrow">{t('eyebrow')}</p>
            <h2 className="mk-h2 mt-2 sm:mt-3">{t('title')}</h2>
            <p className="mk-subtitle">{t('subtitle')}</p>

            <ol className="mt-8 space-y-4 sm:mt-10">
              {steps.map(n => (
                <li key={n} className="flex gap-3 sm:gap-4">
                  <span className="mk-step-num">{n}</span>
                  <p className="mk-text-body pt-0.5 text-sm leading-relaxed sm:text-base">
                    {t(`steps.${n}`)}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 rounded-3xl bg-violet-500/10 blur-3xl" aria-hidden />
            <div className="mk-card relative space-y-3 p-4 sm:space-y-4 sm:p-5">
              <div className="mk-card-inset flex items-center gap-3 p-3 sm:p-4">
                <Monitor className="h-5 w-5 shrink-0 text-sky-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--mk-fg)' }}>
                    {t('cards.desktop.title')}
                  </p>
                  <p className="mk-text-faint text-xs">{t('cards.desktop.hint')}</p>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
              </div>
              <div className="flex justify-center py-1">
                <Cloud className="h-5 w-5 text-emerald-500/70 sm:h-6 sm:w-6" />
              </div>
              <div className="mk-card-inset flex items-center gap-3 p-3 sm:p-4">
                <Smartphone className="h-5 w-5 shrink-0 text-violet-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--mk-fg)' }}>
                    {t('cards.mobile.title')}
                  </p>
                  <p className="mk-text-faint text-xs">{t('cards.mobile.hint')}</p>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
