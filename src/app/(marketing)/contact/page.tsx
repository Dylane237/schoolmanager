import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { MessageCircle, Video, Download } from 'lucide-react'
import { getSupportWhatsAppUrl, SUPPORT_PHONE_DISPLAY } from '@/lib/support'

export default async function ContactPage() {
  const t = await getTranslations('marketing.contact')
  const whatsappUrl = getSupportWhatsAppUrl()
  const demoUrl = getSupportWhatsAppUrl(t('demoMessage'))
  const installUrl = getSupportWhatsAppUrl(t('installMessage'))

  const cards = [
    {
      icon: MessageCircle,
      title: t('whatsapp'),
      hint: t('whatsappHint'),
      href: whatsappUrl,
      cta: `${SUPPORT_PHONE_DISPLAY} · WhatsApp`,
      external: true,
    },
    {
      icon: Video,
      title: t('demo'),
      hint: t('demoHint'),
      href: demoUrl,
      cta: t('demo'),
      external: true,
    },
    {
      icon: Download,
      title: t('installHelp'),
      hint: t('installHint'),
      href: installUrl,
      cta: t('installHelp'),
      external: true,
    },
  ]

  return (
    <div className="mk-container max-w-4xl py-10 sm:py-16">
      <div className="text-center">
        <h1 className="mk-h2">{t('title')}</h1>
        <p className="mk-subtitle mx-auto max-w-2xl">{t('subtitle')}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
        {cards.map(card => {
          const Icon = card.icon
          const Tag = card.external ? 'a' : Link
          const props = card.external
            ? { href: card.href, target: '_blank', rel: 'noopener noreferrer' }
            : { href: card.href }

          return (
            <Tag
              key={card.title}
              {...props}
              className="mk-card mk-card-interactive flex flex-col p-5 sm:p-6 last:sm:col-span-2 last:lg:col-span-1"
            >
              <div className="mk-icon-box">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold sm:text-lg" style={{ color: 'var(--mk-fg)' }}>
                {card.title}
              </h2>
              <p className="mk-text-muted mt-2 flex-1 text-sm">{card.hint}</p>
              <span className="mk-link mt-4 text-sm">{card.cta} →</span>
            </Tag>
          )
        })}
      </div>

      <div className="mk-card mt-8 p-6 text-center sm:mt-10 sm:p-8">
        <p className="mk-text-muted text-sm">
          <Link href="/telecharger" className="mk-link">{t('footerDownload')}</Link>
          {' · '}
          <Link href="/register" className="mk-link">{t('footerRegister')}</Link>
        </p>
      </div>
    </div>
  )
}
