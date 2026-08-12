import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Download, Monitor, Globe, CheckCircle2 } from 'lucide-react'
import { APP_VERSION, getDesktopDownloadUrl, getGitHubReleasesPageUrl } from '@/lib/desktop-download'

export default async function TelechargerPage() {
  const t = await getTranslations('marketing.download')
  const downloadUrl = getDesktopDownloadUrl()

  const requirements = ['os', 'ram', 'disk', 'net'] as const
  const steps = ['1', '2', '3'] as const

  return (
    <div className="mk-container max-w-4xl py-10 sm:py-16">
      <div className="text-center">
        <div className="mk-icon-box mx-auto mb-5 h-14 w-14 sm:mb-6 sm:h-16 sm:w-16">
          <Monitor className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <h1 className="mk-h2">{t('title')}</h1>
        <p className="mk-subtitle mx-auto max-w-2xl">{t('subtitle')}</p>
      </div>

      <div className="mk-card mt-8 overflow-hidden sm:mt-12">
        <div
          className="px-5 py-8 text-center sm:px-8 sm:py-10"
          style={{ background: 'linear-gradient(to bottom right, var(--mk-bg-elevated), var(--mk-preview-bg))', color: '#f8fafc' }}
        >
          <p className="text-sm opacity-80">{t('version', { version: APP_VERSION })}</p>
          <p className="mt-1 text-sm opacity-80">{t('windows')}</p>
          <a href={downloadUrl} className="mk-btn-primary mx-auto mt-6 sm:mt-8">
            <Download className="h-5 w-5" />
            {t('button')}
          </a>
          <p className="mt-4 text-xs opacity-60">{t('sizeHint')}</p>
          <p className="mt-2 text-xs opacity-60">
            <a href={getGitHubReleasesPageUrl()} className="underline hover:opacity-90" target="_blank" rel="noopener noreferrer">
              GitHub Releases
            </a>
          </p>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-2 sm:gap-8 sm:p-8">
          <div>
            <h2 className="text-sm font-semibold sm:text-base" style={{ color: 'var(--mk-fg)' }}>
              {t('requirements.title')}
            </h2>
            <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
              {requirements.map(key => (
                <li key={key} className="mk-text-muted flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {t(`requirements.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold sm:text-base" style={{ color: 'var(--mk-fg)' }}>
              {t('steps.title')}
            </h2>
            <ol className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              {steps.map(n => (
                <li key={n} className="mk-text-muted flex gap-3 text-sm">
                  <span className="mk-step-num !h-6 !w-6 !text-xs">{n}</span>
                  {t(`steps.${n}`)}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="mk-card mt-8 p-6 text-center sm:mt-10 sm:p-8">
        <Globe className="mk-text-faint mx-auto h-7 w-7 sm:h-8 sm:w-8" />
        <h2 className="mt-3 text-lg font-semibold sm:mt-4 sm:text-xl" style={{ color: 'var(--mk-fg)' }}>
          {t('orWeb')}
        </h2>
        <p className="mk-text-muted mt-2 text-sm sm:text-base">{t('orWebDesc')}</p>
        <Link href="/login" className="mk-btn-secondary mt-5 inline-flex sm:mt-6">
          {t('orWebCta')}
        </Link>
      </div>

      <div className="mt-10 space-y-4 sm:mt-12 sm:space-y-6">
        <h2 className="text-lg font-bold sm:text-xl" style={{ color: 'var(--mk-fg)' }}>{t('faq.title')}</h2>
        <div className="space-y-3 sm:space-y-4">
          <div className="mk-card p-4 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--mk-fg)' }}>{t('faq.otherPc.q')}</h3>
            <p className="mk-text-muted mt-2 text-sm">{t('faq.otherPc.a')}</p>
          </div>
          <div className="mk-card p-4 sm:p-6">
            <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'var(--mk-fg)' }}>{t('faq.update.q')}</h3>
            <p className="mk-text-muted mt-2 text-sm">{t('faq.update.a')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
