import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { GraduationCap } from 'lucide-react'

export async function MarketingFooter() {
  const t = await getTranslations('marketing')
  const year = new Date().getFullYear()

  return (
    <footer className="mk-footer">
      <div className="mk-container mk-footer-grid">
        <div className="mk-footer-brand">
          <div className="mk-brand mk-footer-logo">
            <span className="mk-brand-mark" aria-hidden>
              <GraduationCap className="h-[18px] w-[18px] text-white" strokeWidth={2} />
            </span>
            <span className="mk-brand-name">
              School<span className="mk-brand-accent">Manager</span>
            </span>
          </div>
          <p className="mk-footer-tagline">{t('brand.tagline')}</p>
        </div>

        <div className="mk-footer-col">
          <p className="mk-footer-col-title">{t('footer.product')}</p>
          <ul className="mk-footer-links">
            <li><Link href="/">{t('nav.home')}</Link></li>
            <li><Link href="/#pricing">{t('nav.pricing')}</Link></li>
            <li><Link href="/telecharger">{t('nav.download')}</Link></li>
          </ul>
        </div>

        <div className="mk-footer-col">
          <p className="mk-footer-col-title">{t('footer.legal')}</p>
          <ul className="mk-footer-links">
            <li><Link href="/contact">{t('nav.contact')}</Link></li>
            <li><Link href="/login">{t('nav.login')}</Link></li>
            <li><span>{t('footer.privacy')}</span></li>
            <li><span>{t('footer.terms')}</span></li>
          </ul>
        </div>
      </div>

      <div className="mk-footer-bottom">
        <div className="mk-container mk-footer-bottom-inner">
          <span>{t('footer.rights', { year })}</span>
          <span>{t('footer.madeIn')}</span>
        </div>
      </div>
    </footer>
  )
}
