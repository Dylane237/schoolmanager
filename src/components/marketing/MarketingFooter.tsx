import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { GraduationCap } from 'lucide-react'

export async function MarketingFooter() {
  const t = await getTranslations('marketing')
  const year = new Date().getFullYear()

  return (
    <footer className="mk-footer">
      <div className="mk-container py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--mk-fg)' }}>
                School<span className="text-emerald-500">Manager</span>
              </span>
            </div>
            <p className="mk-text-faint mt-3 max-w-xs text-sm">{t('brand.tagline')}</p>
          </div>

          <div>
            <p className="mk-eyebrow !text-[0.65rem] !tracking-wider" style={{ color: 'var(--mk-faint)' }}>
              {t('footer.product')}
            </p>
            <ul className="mt-3 space-y-2 text-sm sm:mt-4">
              <li><Link href="/#features" className="mk-text-muted transition hover:opacity-80">{t('nav.features')}</Link></li>
              <li><Link href="/#pricing" className="mk-text-muted transition hover:opacity-80">{t('nav.pricing')}</Link></li>
              <li><Link href="/telecharger" className="mk-text-muted transition hover:opacity-80">{t('nav.download')}</Link></li>
              <li><Link href="/login" className="mk-text-muted transition hover:opacity-80">{t('nav.login')}</Link></li>
            </ul>
          </div>

          <div>
            <p className="mk-eyebrow !text-[0.65rem] !tracking-wider" style={{ color: 'var(--mk-faint)' }}>
              {t('footer.legal')}
            </p>
            <ul className="mt-3 space-y-2 text-sm sm:mt-4">
              <li><Link href="/contact" className="mk-text-muted transition hover:opacity-80">{t('nav.contact')}</Link></li>
              <li><span className="mk-text-faint">{t('footer.privacy')}</span></li>
              <li><span className="mk-text-faint">{t('footer.terms')}</span></li>
            </ul>
          </div>
        </div>

        <div
          className="mk-text-faint mt-8 border-t pt-6 text-center text-xs sm:mt-10"
          style={{ borderColor: 'var(--mk-border)' }}
        >
          {t('footer.rights', { year })}
        </div>
      </div>
    </footer>
  )
}
