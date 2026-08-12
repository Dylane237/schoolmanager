'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown, ChevronRight, CreditCard, User, Users } from 'lucide-react'
import { studentLinks } from '@/lib/student-context-links'
import EmptyState from '@/components/ui/EmptyState'
import { useTranslatedEnums } from '@/hooks/useTranslatedEnums'
import { getIntlLocale, type Locale } from '@/i18n/config'
import type { EleveSituation, TrancheSituation, FraisExamenLine } from '@/lib/paiements-utils'

const TH = 'text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide'
const TD = 'px-4 py-3.5 align-middle'
const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`

const STATUT_STYLES = {
  paye: 'bg-emerald-100 text-emerald-700',
  partiel: 'bg-amber-100 text-amber-700',
  impaye: 'bg-red-100 text-red-700',
  non_configure: 'bg-slate-100 text-slate-600',
}

function StatutBadge({ statut }: { statut: keyof typeof STATUT_STYLES }) {
  const te = useTranslatedEnums()
  return (
    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUT_STYLES[statut]}`}>
      {te.paymentStatus(statut)}
    </span>
  )
}

function PaiementHistoriqueTable({ historique }: { historique: TrancheSituation['historique'] }) {
  const t = useTranslations('components.situationParEleve')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const te = useTranslatedEnums()

  if (historique.length === 0) {
    return <p className="text-sm text-slate-400 italic py-2">{t('noPayments')}</p>
  }

  return (
    <table className="w-full text-sm mt-2">
      <thead>
        <tr className="text-xs text-slate-400 uppercase border-b border-slate-200">
          <th className="text-left py-2 pr-4">{t('historyDate')}</th>
          <th className="text-left py-2 pr-4">{t('historyReceipt')}</th>
          <th className="text-left py-2 pr-4">{t('historyMode')}</th>
          <th className="text-right py-2">{t('historyAmount')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {historique.map(h => (
          <tr key={h.id}>
            <td className="py-2 pr-4 text-slate-600">{h.date_paiement}</td>
            <td className="py-2 pr-4 font-mono text-xs text-slate-500">{h.recu_numero}</td>
            <td className="py-2 pr-4 text-slate-600">{te.paymentMethod(h.mode_paiement)}</td>
            <td className="py-2 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
              {Number(h.montant).toLocaleString(intlLocale)} {tc('currency')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FraisExamenRow({ frais }: { frais: FraisExamenLine }) {
  const t = useTranslations('components.situationParEleve')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr className="border-t border-violet-100 hover:bg-violet-50/40 transition-colors">
        <td className={`${TD} pl-10`}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 text-left w-full min-w-0"
          >
            {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            <span className="text-sm font-semibold text-violet-800 truncate">{frais.label}</span>
          </button>
        </td>
        <td className={TD_NUM}>
          <span className="text-sm text-slate-600">
            {Number(frais.montant_paye).toLocaleString(intlLocale)} / {Number(frais.montant_attendu).toLocaleString(intlLocale)}
          </span>
        </td>
        <td className={`${TD} text-center`}>
          <StatutBadge statut={frais.statut} />
        </td>
        <td className={TD_NUM}>
          <span className={`text-sm font-semibold ${frais.reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {Number(frais.reste).toLocaleString(intlLocale)}
          </span>
        </td>
        <td />
      </tr>
      {open && (
        <tr className="bg-violet-50/30">
          <td colSpan={5} className="px-10 pb-4 pt-1">
            {frais.date_limite && (
              <p className="text-xs text-slate-500 mb-2">{t('deadline', { date: frais.date_limite })}</p>
            )}
            <PaiementHistoriqueTable historique={frais.historique} />
          </td>
        </tr>
      )}
    </>
  )
}

function TrancheRow({ tranche }: { tranche: TrancheSituation }) {
  const t = useTranslations('components.situationParEleve')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50/80 transition-colors">
        <td className={`${TD} pl-10`}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 text-left w-full min-w-0"
          >
            {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            <span className="text-sm font-semibold text-slate-700">{t('instalment', { n: tranche.tranche_numero })}</span>
          </button>
        </td>
        <td className={TD_NUM}>
          <span className="text-sm text-slate-600">
            {Number(tranche.montant_paye).toLocaleString(intlLocale)} / {Number(tranche.montant_attendu).toLocaleString(intlLocale)}
          </span>
        </td>
        <td className={`${TD} text-center`}>
          <StatutBadge statut={tranche.statut} />
        </td>
        <td className={TD_NUM}>
          <span className={`text-sm font-semibold ${tranche.reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {Number(tranche.reste).toLocaleString(intlLocale)}
          </span>
        </td>
        <td />
      </tr>
      {open && (
        <tr className="bg-slate-50/80">
          <td colSpan={5} className="px-10 pb-4 pt-1">
            <div className="grid grid-cols-3 gap-4 py-2 text-sm max-w-md">
              <div>
                <p className="text-slate-400 text-xs mb-0.5">{t('expectedLabel')}</p>
                <p className="font-semibold text-slate-700 tabular-nums">{Number(tranche.montant_attendu).toLocaleString(intlLocale)} {tc('currency')}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">{t('paidLabel')}</p>
                <p className="font-semibold text-emerald-600 tabular-nums">{Number(tranche.montant_paye).toLocaleString(intlLocale)} {tc('currency')}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-0.5">{t('remainingLabel')}</p>
                <p className={`font-semibold tabular-nums ${tranche.reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {Number(tranche.reste).toLocaleString(intlLocale)} {tc('currency')}
                </p>
              </div>
            </div>
            {tranche.date_limite && (
              <p className="text-xs text-slate-500 mb-2">{t('deadline', { date: tranche.date_limite })}</p>
            )}
            <PaiementHistoriqueTable historique={tranche.historique} />
          </td>
        </tr>
      )}
    </>
  )
}

function EleveSituationRow({ slug, situation }: { slug: string; situation: EleveSituation }) {
  const t = useTranslations('components.situationParEleve')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const [open, setOpen] = useState(false)
  const links = studentLinks(slug, {
    id: situation.eleve_id,
    nom: situation.nom,
    prenom: situation.prenom,
    numero_matricule: situation.numero_matricule,
    classe_id: situation.classe_id,
  })

  return (
    <Fragment>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
        <td className={`${TD} min-w-[220px]`}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-3 text-left w-full min-w-0"
          >
            {open
              ? <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
              : <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />}
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">
                {situation.nom} {situation.prenom}
              </p>
              <p className="text-sm text-slate-400 truncate">
                {situation.numero_matricule} — {situation.classe_nom ?? t('noClass')}
              </p>
            </div>
          </button>
        </td>
        <td className={`${TD_NUM} w-28`}>
          <span className="text-sm font-semibold text-emerald-600">
            {Number(situation.total_paye).toLocaleString(intlLocale)}
          </span>
        </td>
        <td className={`${TD_NUM} w-28`}>
          <span className={`text-sm font-semibold ${situation.total_reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {Number(situation.total_reste).toLocaleString(intlLocale)}
          </span>
        </td>
        <td className={`${TD} text-center w-32`}>
          <StatutBadge statut={situation.statut} />
        </td>
        <td className={`${TD} w-24`}>
          <div className="flex items-center justify-end gap-1">
            <Link href={links.fiche} title={t('viewProfile')}
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <User className="w-4 h-4" />
            </Link>
            <Link href={links.encaisser} title={t('collect')}
              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <CreditCard className="w-4 h-4" />
            </Link>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/60 border-b border-slate-100">
          <td colSpan={5} className="p-0">
            {situation.tranches.length === 0 && !situation.frais_examen ? (
              <p className="text-sm text-slate-500 px-10 py-4">{t('noInstalments')}</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-200/80">
                    <th className={`${TH} pl-10`}>{t('detail')}</th>
                    <th className={`${TH} text-right`}>{t('paidExpected')}</th>
                    <th className={`${TH} text-center`}>{t('status')}</th>
                    <th className={`${TH} text-right`}>{t('remaining')}</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {situation.tranches.map(tr => (
                    <TrancheRow key={tr.tranche_numero} tranche={tr} />
                  ))}
                  {situation.frais_examen && (
                    <FraisExamenRow frais={situation.frais_examen} />
                  )}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  )
}

interface SituationParEleveProps {
  slug: string
  situations: EleveSituation[]
  loading: boolean
}

export default function SituationParEleve({ slug, situations, loading }: SituationParEleveProps) {
  const t = useTranslations('components.situationParEleve')

  return (
    <div className="card overflow-hidden">
      {loading ? (
        <div className="p-12 text-center text-slate-400">{t('loading')}</div>
      ) : situations.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] table-fixed">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className={TH}>{t('student')}</th>
                <th className={`${TH} text-right`}>{t('paid')}</th>
                <th className={`${TH} text-right`}>{t('remaining')}</th>
                <th className={`${TH} text-center`}>{t('status')}</th>
                <th className={`${TH} text-right`} />
              </tr>
            </thead>
            <tbody>
              {situations.map(s => (
                <EleveSituationRow key={s.eleve_id} slug={slug} situation={s} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
