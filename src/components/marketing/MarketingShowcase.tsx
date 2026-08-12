import { getTranslations } from 'next-intl/server'
import { AuthDashboardPreview } from '@/components/auth/auth-dashboard-preview'
import { MarketingScreenshot } from '@/components/marketing/MarketingScreenshot'

const SHOWCASES = [
  { key: 'payments' as const, screenshot: '/marketing/paiements.png' },
  { key: 'students' as const, screenshot: '/marketing/eleves.png' },
  { key: 'dashboard' as const, screenshot: null },
]

export async function MarketingShowcase() {
  const t = await getTranslations('marketing.showcase')

  return (
    <section className="mk-section">
      <div className="mk-container space-y-16 sm:space-y-20 lg:space-y-24">
        {SHOWCASES.map(({ key, screenshot }, i) => {
          const reversed = i % 2 === 1
          return (
            <div
              key={key}
              className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12"
            >
              <div className={reversed ? 'lg:order-2' : 'lg:order-1'}>
                <span className="mk-eyebrow">{t(`${key}.label`)}</span>
                <h3 className="mk-h3 mt-2 sm:mt-3">{t(`${key}.title`)}</h3>
                <p className="mk-subtitle !mt-3 sm:!mt-4">{t(`${key}.desc`)}</p>
                <div className="mt-5 flex flex-wrap gap-5 sm:mt-6 sm:gap-8">
                  {(t.raw(`${key}.stats`) as { value: string; label: string }[]).map(stat => (
                    <div key={stat.label}>
                      <p className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--mk-fg)' }}>
                        {stat.value}
                      </p>
                      <p className="mk-text-faint text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`relative ${reversed ? 'lg:order-1' : 'lg:order-2'}`}>
                <div
                  className="absolute -inset-3 rounded-3xl blur-2xl sm:-inset-4"
                  style={{ background: 'var(--mk-accent-soft)' }}
                  aria-hidden
                />
                <div className="mk-card relative overflow-hidden p-1.5 sm:p-2">
                  {screenshot ? (
                    <MarketingScreenshot
                      src={screenshot}
                      alt={t(`${key}.imageAlt`)}
                    />
                  ) : (
                    <div className="overflow-hidden rounded-lg">
                      <AuthDashboardPreview variant="compact" className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
