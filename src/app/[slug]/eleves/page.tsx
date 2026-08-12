'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, UserX } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useClasses } from '@/hooks/useClasses'
import {
  useSectionOptions,
  useStudentStatutOptions,
  useStudentFilters,
  useTranslatedEnums,
} from '@/hooks/useTranslatedEnums'

interface Eleve {
  id: string
  numero_matricule: string
  nom: string
  prenom: string
  sexe: string
  section: string
  classe_nom: string
  photo_url: string | null
  parent_nom: string
  parent_telephone: string
  total_paye: number
  total_attendu: number
}

function ElevesPageContent() {
  const { slug } = useParams()
  const router = useRouter()
  const t = useTranslations('eleves')
  const tc = useTranslations('common')
  const tf = useTranslations('filters')
  const te = useTranslatedEnums()
  const { classes } = useClasses()
  const sectionOptions = useSectionOptions()
  const statutOptions = useStudentStatutOptions()
  const presets = useStudentFilters()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)

  const filterFields = useMemo(() => [
    {
      key: 'q',
      type: 'search' as const,
      placeholder: t('list.searchPlaceholder'),
      debounce: true,
    },
    {
      key: 'section',
      type: 'select' as const,
      label: tf('section.label'),
      options: sectionOptions,
      defaultValue: '',
    },
    {
      key: 'classe',
      type: 'select' as const,
      label: tf('class.label'),
      options: [{ value: '', label: t('list.allClasses') }],
      defaultValue: '',
    },
    {
      key: 'statut',
      type: 'select' as const,
      label: tf('payment.label'),
      options: statutOptions,
      defaultValue: 'tous',
    },
  ], [t, tf, sectionOptions, statutOptions])

  const fields = useMemo(() => {
    const classeOptions = [
      { value: '', label: t('list.allClasses') },
      { value: '__none__', label: tf('students.noClass') },
      ...classes.map(c => ({ value: c.id, label: c.nom })),
    ]
    return filterFields.map(f =>
      f.key === 'classe' ? { ...f, options: classeOptions } : f
    )
  }, [filterFields, classes, t, tf])

  const {
    values,
    debouncedValues,
    setFilter,
    applyPreset,
    reset,
    activeFilters,
  } = useSmartFilters(fields)

  const fetchEleves = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedValues.q) params.set('search', debouncedValues.q)
    if (debouncedValues.section) params.set('section', debouncedValues.section)
    if (debouncedValues.classe) params.set('classe_id', debouncedValues.classe)
    if (debouncedValues.statut && debouncedValues.statut !== 'tous') {
      params.set('statut_paiement', debouncedValues.statut)
    }

    const res = await fetch(`/api/eleves?${params}`)
    const data = await res.json()
    setEleves(data.eleves || [])
    setLoading(false)
  }, [debouncedValues])

  useEffect(() => { fetchEleves() }, [fetchEleves])

  const getStatutPaiement = (paye: number, attendu: number) => {
    if (attendu === 0) return { label: t('list.paymentNa'), variant: 'neutral' as const }
    const reste = attendu - paye
    if (reste <= 0) return { label: te.paymentStatus('paye'), variant: 'success' as const }
    if (paye > 0) return { label: te.paymentStatus('partiel'), variant: 'warning' as const }
    return { label: te.paymentStatus('impaye'), variant: 'danger' as const }
  }

  const columnHeaders = [
    t('list.columns.student'),
    t('list.columns.matricule'),
    t('list.columns.class'),
    t('list.columns.section'),
    t('list.columns.parentContact'),
    t('list.columns.payment'),
    '',
  ]

  return (
    <PageShell
      title={t('list.title')}
      subtitle={t('list.subtitle', { count: eleves.length })}
      breadcrumb={t('list.breadcrumb')}
      actions={
        <button onClick={() => router.push(`/${slug}/eleves/nouveau`)}
          className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" /> {t('list.newStudent')}
        </button>
      }
    >
      <SmartFilterBar
        fields={fields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        presets={presets}
        onPreset={applyPreset}
        resultCount={eleves.length}
        resultLabel={t('list.resultLabel')}
        loading={loading}
        className="mb-6"
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-base">{tc('loading')}</div>
        ) : eleves.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={t('list.emptyTitle')}
            description={t('list.emptyDescription')}
            action={
              <button onClick={() => router.push(`/${slug}/eleves/nouveau`)} className="btn-primary">
                {t('list.emptyAction')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {columnHeaders.map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eleves.map((eleve) => {
                  const statut = getStatutPaiement(eleve.total_paye, eleve.total_attendu)
                  return (
                    <tr key={eleve.id}
                      onClick={() => router.push(`/${slug}/eleves/${eleve.id}`)}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {eleve.photo_url ? (
                              <img src={eleve.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                                {eleve.prenom[0]}{eleve.nom[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                              {eleve.nom} {eleve.prenom}
                            </p>
                            <p className="text-sm text-slate-400">{te.sex(eleve.sexe)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-slate-500">{eleve.numero_matricule}</td>
                      <td className="px-5 py-4 text-base text-slate-600">{eleve.classe_nom || '—'}</td>
                      <td className="px-5 py-4">
                        <Badge variant="neutral">{eleve.section ? te.section(eleve.section) : '—'}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-base text-slate-700">{eleve.parent_nom || '—'}</p>
                        <p className="text-sm text-slate-400">{eleve.parent_telephone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statut.variant}>{statut.label}</Badge>
                      </td>
                      <td className="px-5 py-4 text-emerald-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {tc('viewProfile')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  )
}

function ElevesPageFallback() {
  const t = useTranslations('eleves')

  return (
    <PageShell title={t('list.title')} breadcrumb={t('list.breadcrumb')}>
      <div className="card p-16 text-center text-slate-400">{t('list.loadingFilters')}</div>
    </PageShell>
  )
}

export default function ElevesPage() {
  return (
    <Suspense fallback={<ElevesPageFallback />}>
      <ElevesPageContent />
    </Suspense>
  )
}
