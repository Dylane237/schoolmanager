import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import PageShell from '@/components/layout/PageShell'
import { fetchCloudDashboardStats } from '@/lib/cloud-read'
import { Users, DoorOpen, Banknote, Cloud, AlertCircle } from 'lucide-react'

export default async function CloudDashboard({ slug }: { slug: string }) {
  const t = await getTranslations('dashboard')
  const tCommon = await getTranslations('common')
  const cloud = await fetchCloudDashboardStats(slug)

  if (!cloud?.stats) {
    return (
      <PageShell title={t('title')} subtitle={t('subtitle')}>
        <div className="card p-10 text-center max-w-lg mx-auto">
          <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800">{t('cloud.noDataTitle')}</h2>
          <p className="text-sm text-slate-500 mt-2">{t('cloud.noDataDescription')}</p>
          <Link href={`/${slug}/donnees`} className="btn-primary inline-flex mt-6">
            {t('cloud.syncAction')}
          </Link>
        </div>
      </PageShell>
    )
  }

  const s = cloud.stats as {
    totalEleves: number
    totalClasses: number
    totalMois: number
    impayes: number
    classesPaiement: { classe: string; effectif: number; payes: number; pct: number }[]
    derniersPaiements: { montant: number; date_paiement: string; eleve_nom: string; eleve_prenom: string; classe_nom: string | null }[]
  }

  const stats = [
    { label: t('stats.activeStudents'), value: String(s.totalEleves), Icon: Users },
    { label: t('stats.classes'), value: String(s.totalClasses), Icon: DoorOpen },
    { label: t('stats.collectedThisMonth'), value: `${Number(s.totalMois).toLocaleString()} ${tCommon('currency')}`, Icon: Banknote },
  ]

  return (
    <PageShell
      title={t('title')}
      subtitle={
        <span className="flex items-center gap-2 flex-wrap">
          {t('cloud.readOnlyBadge')}
          {cloud.synced_at && (
            <span className="text-xs text-slate-400">
              {t('cloud.syncedAt', { date: new Date(cloud.synced_at).toLocaleString() })}
            </span>
          )}
        </span>
      }
    >
      {s.impayes > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {t('alerts.unpaid', { count: s.impayes })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(item => (
          <div key={item.label} className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <item.Icon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{item.value}</p>
              <p className="text-sm text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{t('cloud.paymentByClass')}</h3>
          <div className="space-y-2">
            {s.classesPaiement.slice(0, 8).map(c => (
              <div key={c.classe} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{c.classe}</span>
                <span className="font-medium text-slate-800">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">{t('cloud.recentPayments')}</h3>
          <div className="space-y-2">
            {s.derniersPaiements.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{p.eleve_nom} {p.eleve_prenom}</span>
                <span className="font-medium text-emerald-700">{Number(p.montant).toLocaleString()} {tCommon('currency')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('modules.students.label'), href: `/${slug}/eleves` },
          { label: t('modules.payments.label'), href: `/${slug}/paiements` },
          { label: t('modules.classes.label'), href: `/${slug}/classes` },
          { label: t('modules.reportCards.label'), href: `/${slug}/notes/bulletins` },
        ].map(m => (
          <Link key={m.href} href={m.href} className="card p-4 hover:border-emerald-300 transition-colors text-center">
            <span className="text-sm font-medium text-slate-700">{m.label}</span>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
