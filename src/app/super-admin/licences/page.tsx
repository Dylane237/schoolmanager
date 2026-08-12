'use client'

import Link from 'next/link'
import { ExternalLink, KeyRound, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'

const CLOUD_ADMIN_URL = 'https://schoolmanager-eosin.vercel.app/admin-licences'

export default function SuperAdminLicencesPage() {
  const t = useTranslations('superAdmin')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('licences.title')}</h1>
        <p className="text-slate-500 mt-1">
          {t('licences.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">{t('licences.consoleTitle')}</p>
            <p className="text-sm text-emerald-800/80 mt-1 leading-relaxed">
              {t('licences.consoleDesc')}
            </p>
          </div>
        </div>
        <a
          href={CLOUD_ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
        >
          {t('licences.openCloudAdmin')}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 flex gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-2">
          <p>
            {t.rich('licences.localInfo', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <p>
            {t('licences.localView')}{' '}
            <Link href="/super-admin/ecoles" className="text-emerald-600 hover:underline">
              {t('licences.schoolsLink')}
            </Link>
            {' · '}
            <Link href="/super-admin/dashboard" className="text-emerald-600 hover:underline">
              {t('licences.dashboardLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
