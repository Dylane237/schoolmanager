import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'

const STATS = ['1', '2', '3'] as const

export async function MarketingHero() {
  const t = await getTranslations('marketing.hero')
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="mk-hero">
      <div className="mk-hero-watermark" aria-hidden>SM</div>
      <div className="mk-container mk-hero-body">
        <div className="mk-hero-tag">
          <span className="mk-hero-tag-dot" aria-hidden />
          {t('kicker')}
        </div>
        <h1 className="mk-display-title">
          {t('titleLine1')}
          <br />
          <span className="mk-display-accent">{t('titleLine2')}</span>
        </h1>
        <p className="mk-hero-sub">{t('subtitle')}</p>
        <div className="mk-hero-actions">
          <Link href="/register" className="mk-btn-primary">
            {t('ctaRegister')}
          </Link>
          <a href={downloadUrl} className="mk-btn-outline">
            {t('ctaDownload')}
          </a>
        </div>
        <p className="mk-hero-note">{t('editorNote')}</p>
      </div>
      <div className="mk-hero-stats">
        {STATS.map(n => (
          <div key={n} className="mk-stat-item">
            <p className="mk-stat-num">{t(`stats.${n}.value`)}</p>
            <p className="mk-stat-label">{t(`stats.${n}.label`)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
