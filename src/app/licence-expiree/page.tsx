import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ShieldAlert, Mail, ArrowLeft } from 'lucide-react'
import { WhatsAppSupportLink } from '@/components/support/whatsapp-support-link'
import LicenceRenewForm from '@/components/licence/LicenceRenewForm'

export default async function LicenceExpireePage() {
  const t = await getTranslations('licence.expired')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mb-5">
            <ShieldAlert className="w-8 h-8 text-red-400" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-lg mb-4">{t('howToRenew')}</h2>
          <ol className="space-y-3 text-slate-300 text-base">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0">1</span>
              {t('step1')}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0">2</span>
              {t('step2')}
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0">3</span>
              {t('step3')}
            </li>
          </ol>

          <div className="mt-6 space-y-3">
            <WhatsAppSupportLink
              variant="dark"
              message={t('whatsappMessage')}
            />
            <a
              href="mailto:support@schoolmanager.cm"
              className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl px-5 py-3.5 transition-colors border border-white/10"
            >
              <Mail className="w-5 h-5" strokeWidth={1.75} />
              {t('emailSupport')}
            </a>
          </div>

          <LicenceRenewForm />
        </div>

        <Link href="/login"
          className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-white text-base transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  )
}
