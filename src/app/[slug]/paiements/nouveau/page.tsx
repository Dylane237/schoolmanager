'use client'

import { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Check, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import RecuPrint from '@/components/paiements/RecuPrint'
import PageShell from '@/components/layout/PageShell'
import { usePaymentMethodOptions } from '@/hooks/useTranslatedEnums'
import type { EleveSituation } from '@/lib/paiements-utils'

interface FraisExamenSituation {
  config: { id: string; label: string; montant: number; date_limite: string | null } | null
  montant_attendu: number
  montant_paye: number
  reste: number
  statut: string
  date_limite: string | null
  jours_restants: number | null
  en_retard: boolean
}

interface Eleve {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  classe_nom: string
  total_paye: number
  total_attendu: number
}

function NouveauPaiementFallback() {
  const t = useTranslations('paiements')
  const tc = useTranslations('common')

  return (
    <PageShell title={t('new.title')} breadcrumb={t('new.breadcrumb')}>
      <div className="card p-12 text-center text-slate-400">{tc('loading')}</div>
    </PageShell>
  )
}

export default function NouveauPaiementPage() {
  return (
    <Suspense fallback={<NouveauPaiementFallback />}>
      <NouveauPaiementContent />
    </Suspense>
  )
}

function NouveauPaiementContent() {
  const { slug } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('paiements')
  const tc = useTranslations('common')
  const paymentMethodOptions = usePaymentMethodOptions()

  const prefillDone = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [eleveSelectionne, setEleveSelectionne] = useState<Eleve | null>(null)
  const [situation, setSituation] = useState<EleveSituation | null>(null)
  const [fraisExamen, setFraisExamen] = useState<FraisExamenSituation | null>(null)
  const isFraisExamen = searchParams.get('type') === 'frais_examen'
  const [recu, setRecu] = useState<{ id: string; recu_numero?: string } | null>(null)

  const [form, setForm] = useState({
    eleve_id: '',
    tranche_numero: '1',
    frais_annexe_id: '',
    montant: '',
    mode_paiement: 'especes',
    date_paiement: new Date().toISOString().split('T')[0],
  })

  const paymentMethods = useMemo(
    () => paymentMethodOptions.filter(o => o.value !== ''),
    [paymentMethodOptions]
  )

  const up = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (search.length < 2) { setEleves([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/eleves?search=${search}`)
      const data = await res.json()
      setEleves(data.eleves || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!eleveSelectionne) {
      setSituation(null)
      setFraisExamen(null)
      return
    }
    if (isFraisExamen) {
      fetch(`/api/frais-examens?eleve_id=${eleveSelectionne.id}`)
        .then(r => r.json())
        .then(data => {
          const s = data.situation as FraisExamenSituation | null
          setFraisExamen(s)
          setSituation(null)
          if (s?.config && s.reste > 0) {
            setForm(prev => ({
              ...prev,
              frais_annexe_id: s.config!.id,
              montant: String(s.reste),
            }))
          }
        })
      return
    }
    fetch(`/api/paiements?view=situation&eleve_id=${eleveSelectionne.id}`)
      .then(r => r.json())
      .then(data => {
        const s = data.situation as EleveSituation | null
        setSituation(s)
        setFraisExamen(null)
        if (s?.tranches.length) {
          const firstDue = s.tranches.find(t => t.reste > 0) ?? s.tranches[0]
          setForm(prev => ({
            ...prev,
            tranche_numero: String(firstDue.tranche_numero),
            montant: firstDue.reste > 0 ? String(firstDue.reste) : '',
          }))
        }
      })
  }, [eleveSelectionne, isFraisExamen])

  const selectEleve = (eleve: Eleve) => {
    setEleveSelectionne(eleve)
    setForm(prev => ({ ...prev, eleve_id: eleve.id, tranche_numero: '1', frais_annexe_id: '', montant: '' }))
    setSearch('')
    setEleves([])
  }

  useEffect(() => {
    const eleveId = searchParams.get('eleve_id')
    if (!eleveId || prefillDone.current) return
    prefillDone.current = true
    fetch(`/api/eleves/${eleveId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data?.eleve) return
        const e = data.eleve
        selectEleve({
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          numero_matricule: e.numero_matricule,
          classe_nom: e.classe_nom || '',
          total_paye: 0,
          total_attendu: 0,
        })
      })
  }, [searchParams])

  const trancheActive = situation?.tranches.find(
    tr => tr.tranche_numero === Number(form.tranche_numero),
  )

  const handleTrancheChange = (numero: string) => {
    up('tranche_numero', numero)
    const tr = situation?.tranches.find(t => t.tranche_numero === Number(numero))
    if (tr && tr.reste > 0) up('montant', String(tr.reste))
  }

  const handleSubmit = async () => {
    if (!form.eleve_id || !form.montant) {
      setError(t('new.errors.selectStudent'))
      return
    }
    if (isFraisExamen && !form.frais_annexe_id) {
      setError(t('new.errors.noExamFees'))
      return
    }
    setLoading(true)
    setError('')

    const payload = isFraisExamen
      ? {
          eleve_id: form.eleve_id,
          frais_annexe_id: form.frais_annexe_id,
          montant: form.montant,
          mode_paiement: form.mode_paiement,
          date_paiement: form.date_paiement,
        }
      : form

    const res = await fetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || t('new.errors.saveFailed'))
      setLoading(false)
      return
    }

    setRecu(data.recu)
    setLoading(false)
  }

  const totalAttendu = isFraisExamen
    ? (fraisExamen?.montant_attendu ?? 0)
    : (situation?.total_attendu ?? eleveSelectionne?.total_attendu ?? 0)
  const totalPaye = isFraisExamen
    ? (fraisExamen?.montant_paye ?? 0)
    : (situation?.total_paye ?? eleveSelectionne?.total_paye ?? 0)
  const reste = isFraisExamen
    ? (fraisExamen?.reste ?? 0)
    : (situation?.total_reste ?? (totalAttendu - totalPaye))

  return (
    <PageShell
      title={isFraisExamen ? t('new.titleExam') : t('new.title')}
      breadcrumb={isFraisExamen ? t('new.breadcrumbExam') : t('new.breadcrumb')}
      subtitle={isFraisExamen ? t('new.subtitleExam') : t('new.subtitle')}
    >
      <div className="max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-base">
          {error}
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">{t('new.studentLabel')}</label>
          {eleveSelectionne ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div>
                <p className="font-semibold text-slate-800 text-base">
                  {eleveSelectionne.nom} {eleveSelectionne.prenom}
                </p>
                <p className="text-sm text-slate-500">
                  {eleveSelectionne.numero_matricule} — {eleveSelectionne.classe_nom}
                </p>
              </div>
              <button onClick={() => { setEleveSelectionne(null); setSituation(null); setForm(p => ({ ...p, eleve_id: '' })) }}
                className="text-sm text-slate-400 hover:text-slate-600">
                {tc('change')}
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder={t('new.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 text-base focus:outline-none"
                />
              </div>
              {eleves.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 z-10 max-h-48 overflow-y-auto">
                  {eleves.map(eleve => (
                    <button key={eleve.id} onClick={() => selectEleve(eleve)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <p className="font-medium text-slate-800 text-base">
                        {eleve.nom} {eleve.prenom}
                      </p>
                      <p className="text-sm text-slate-400">
                        {eleve.numero_matricule} — {eleve.classe_nom || t('new.noClass')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {eleveSelectionne && (
          <>
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg text-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('new.totalExpected')}</p>
                <p className="font-bold text-slate-800 text-base">
                  {Number(totalAttendu).toLocaleString('fr-FR')} {tc('currency')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('new.alreadyPaid')}</p>
                <p className="font-bold text-emerald-600 text-base">
                  {Number(totalPaye).toLocaleString('fr-FR')} {tc('currency')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('new.remainingDue')}</p>
                <p className={`font-bold text-base ${reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {Number(reste).toLocaleString('fr-FR')} {tc('currency')}
                </p>
              </div>
            </div>

            {isFraisExamen && fraisExamen?.config ? (
              <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                <p className="text-sm font-semibold text-violet-800">{fraisExamen.config.label}</p>
                {fraisExamen.date_limite && (
                  <p className={`text-xs mt-1 ${fraisExamen.en_retard ? 'text-red-600' : 'text-slate-500'}`}>
                    {t('new.dueDate', { date: new Date(fraisExamen.date_limite).toLocaleDateString('fr-FR') })}
                    {fraisExamen.en_retard && ` ${t('new.dueDateOverdue')}`}
                  </p>
                )}
              </div>
            ) : situation && situation.tranches.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">{t('new.installmentDetail')}</p>
                <div className="grid gap-2">
                  {situation.tranches.map(tr => (
                    <div
                      key={tr.tranche_numero}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                        Number(form.tranche_numero) === tr.tranche_numero
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="font-semibold text-slate-700">{t('new.installment', { num: tr.tranche_numero })}</span>
                      <span className="text-slate-500">
                        {Number(tr.montant_paye).toLocaleString('fr-FR')} / {Number(tr.montant_attendu).toLocaleString('fr-FR')} {tc('currency')}
                      </span>
                      <span className={tr.reste > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {tr.reste > 0 ? t('new.remaining', { amount: Number(tr.reste).toLocaleString('fr-FR') }) : t('new.paid')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        {!isFraisExamen && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">{t('new.installmentLabel')}</label>
            <select
              value={form.tranche_numero}
              onChange={e => handleTrancheChange(e.target.value)}
              className="input-field"
              disabled={!eleveSelectionne}
            >
              {(situation?.tranches.length ? situation.tranches : [{ tranche_numero: 1 }, { tranche_numero: 2 }, { tranche_numero: 3 }]).map(tr => (
                <option key={tr.tranche_numero} value={tr.tranche_numero}>
                  {t('new.installment', { num: tr.tranche_numero })}
                  {'montant_attendu' in tr && tr.montant_attendu
                    ? ` — ${Number(tr.montant_attendu).toLocaleString('fr-FR')} ${tc('currency')}`
                    : ''}
                </option>
              ))}
            </select>
            {trancheActive && (
              <p className="text-xs text-slate-500 mt-1">
                {t('new.remainingOnInstallment', { amount: Number(trancheActive.reste).toLocaleString('fr-FR') })}
              </p>
            )}
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">{t('new.amountLabel')}</label>
            <input type="number" value={form.montant} onChange={e => up('montant', e.target.value)}
              placeholder="50000"
              className="input-field" />
          </div>
        </div>
        )}

        {isFraisExamen && (
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">{t('new.amountLabel')}</label>
            <input type="number" value={form.montant} onChange={e => up('montant', e.target.value)}
              placeholder="15000"
              className="input-field" />
            {fraisExamen && fraisExamen.reste > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {t('new.remainingToPay', { amount: Number(fraisExamen.reste).toLocaleString('fr-FR') })}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">{t('new.paymentMethod')}</label>
            <select value={form.mode_paiement} onChange={e => up('mode_paiement', e.target.value)}
              className="input-field">
              {paymentMethods.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">{t('new.dateLabel')}</label>
            <input type="date" value={form.date_paiement} onChange={e => up('date_paiement', e.target.value)}
              className="input-field" />
          </div>
        </div>

        <button onClick={handleSubmit}
          disabled={loading || !form.eleve_id || !form.montant || (isFraisExamen && !form.frais_annexe_id)}
          className="w-full btn-primary flex items-center justify-center gap-2">
          {loading ? tc('saving') : <><Check className="w-5 h-5" /> {isFraisExamen ? t('new.submitExam') : t('new.submit')}</>}
        </button>
      </div>

      {recu && (
        <RecuPrint
          paiementId={recu.id}
          numero={recu.recu_numero}
          onClose={() => router.push(`/${slug}/paiements`)}
        />
      )}
      </div>
    </PageShell>
  )
}
