'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, School, UserCheck, ChevronRight, Layers, ArrowRightLeft, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import { useSchool } from '@/components/layout/SchoolProvider'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useSectionOptions, useTranslatedEnums } from '@/hooks/useTranslatedEnums'
import { canWriteModule } from '@/lib/rbac'
import {
  CAMEROON_SECTIONS,
  SECTION_ORDER,
  type SectionRef,
} from '@/lib/cameroon-levels'

interface Classe {
  id: string
  nom: string
  section: string
  niveau: string
  annee_scolaire: string
  capacite_max: number
  nb_eleves: number
  personnel_id: string | null
  enseignant_nom: string | null
  enseignant_prenom: string | null
}

interface Enseignant {
  id: string
  nom: string
  prenom: string | null
}

export default function ClassesPage() {
  const { slug } = useParams()
  const { anneeScolaire, userRole } = useSchool()
  const t = useTranslations('classes')
  const tc = useTranslations('common')
  const tf = useTranslations('filters')
  const te = useTranslatedEnums()
  const sectionOptions = useSectionOptions()
  const canCreateClass = canWriteModule(userRole, 'classes')
  const [classes, setClasses] = useState<Classe[]>([])
  const [enseignants, setEnseignants] = useState<Enseignant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showReferentiel, setShowReferentiel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNiveaux, setSelectedNiveaux] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    nom: '', section: 'francophone', niveau: '',
    annee_scolaire: anneeScolaire, capacite_max: '60',
  })

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

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
  ], [t, tf, sectionOptions])

  const { values, debouncedValues, setFilter, reset, activeFilters } = useSmartFilters(filterFields)

  const filteredClasses = useMemo(() => {
    const q = debouncedValues.q?.toLowerCase().trim()
    const section = debouncedValues.section
    return classes.filter(c => {
      if (section && c.section !== section) return false
      if (q) {
        const hay = `${c.nom} ${c.niveau} ${c.enseignant_nom ?? ''} ${c.enseignant_prenom ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [classes, debouncedValues.q, debouncedValues.section])

  const fetchClasses = async () => {
    setLoading(true)
    const [cRes, pRes] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/personnel?type=enseignant'),
    ])
    const cData = await cRes.json()
    const pData = await pRes.json()
    setClasses(cData.classes || [])
    setEnseignants(pData.personnel || [])
    setLoading(false)
  }

  useEffect(() => { fetchClasses() }, [])

  const handleCreate = async () => {
    if (!form.nom || !form.section) return
    setSaving(true)
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error(t('list.toasts.createError'))
      setSaving(false)
      return
    }
    toast.success(t('list.toasts.created'))
    setShowForm(false)
    setForm({ nom: '', section: 'francophone', niveau: '', annee_scolaire: anneeScolaire, capacite_max: '60' })
    await fetchClasses()
    setSaving(false)
  }

  const handleBulkCreate = async () => {
    if (selectedNiveaux.size === 0) return
    setSaving(true)
    const toCreate: { nom: string; section: string; niveau: string; code: string }[] = []

    for (const key of selectedNiveaux) {
      const [section, code] = key.split('::')
      const sec = CAMEROON_SECTIONS.find(s => s.id === section)
      if (!sec) continue
      for (const cycle of sec.cycles) {
        const nv = cycle.niveaux.find(n => n.code === code)
        if (nv) {
          toCreate.push({ nom: nv.nomDefaut, section, niveau: nv.code, code: nv.code })
        }
      }
    }

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes: toCreate, annee_scolaire: anneeScolaire }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(t('list.toasts.createError'))
      setSaving(false)
      return
    }
    toast.success(t('list.toasts.createdBulk', { count: data.created }))
    setShowReferentiel(false)
    setSelectedNiveaux(new Set())
    await fetchClasses()
    setSaving(false)
  }

  const toggleNiveau = (section: string, code: string) => {
    const key = `${section}::${code}`
    setSelectedNiveaux(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isNiveauCreated = (section: string, nomDefaut: string) =>
    classes.some(c => c.section === section && (c.nom === nomDefaut || c.niveau === nomDefaut))

  const handleAssignEnseignant = async (classeId: string, personnelId: string) => {
    const res = await fetch('/api/classes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: classeId, personnel_id: personnelId || null }),
    })
    if (!res.ok) {
      toast.error(t('list.toasts.assignError'))
      return
    }
    toast.success(t('list.toasts.assigned'))
    await fetchClasses()
  }

  const grouped = SECTION_ORDER.reduce((acc: Record<string, Classe[]>, section) => {
    const items = filteredClasses.filter(c => c.section === section)
    if (items.length > 0) acc[section] = items
    return acc
  }, {})

  return (
    <PageShell
      title={t('list.title')}
      subtitle={t('list.subtitle', { count: filteredClasses.length, year: anneeScolaire })}
      breadcrumb={t('list.breadcrumb')}
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/${slug}/classes/transferts`} className="btn-secondary flex items-center gap-2 py-2.5">
            <ArrowRightLeft className="w-5 h-5" /> {t('list.transfers')}
          </Link>
          {canCreateClass && (
            <>
              <button onClick={() => setShowReferentiel(true)} className="btn-secondary flex items-center gap-2 py-2.5">
                <Layers className="w-5 h-5" /> {t('list.referential')}
              </button>
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2.5">
                <Plus className="w-5 h-5" /> {t('list.newClass')}
              </button>
            </>
          )}
        </div>
      }
    >
      <SmartFilterBar
        fields={filterFields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={filteredClasses.length}
        resultLabel={t('list.resultLabel')}
        loading={loading}
        className="mb-6"
      />

      <Modal open={showReferentiel} onClose={() => setShowReferentiel(false)} title={t('list.referentialTitle')}>
        <p className="text-sm text-slate-500 mb-4">
          {t('list.referentialDesc', { year: anneeScolaire })}
        </p>
        <div className="max-h-80 overflow-y-auto space-y-4 mb-4">
          {CAMEROON_SECTIONS.map((sec: SectionRef) => (
            <div key={sec.id}>
              <p className="font-semibold text-slate-700 mb-2">{sec.label}</p>
              {sec.cycles.map(cycle => (
                <div key={cycle.nom} className="mb-3 pl-2">
                  <p className="text-xs text-slate-400 mb-1.5">{cycle.nom}</p>
                  <div className="space-y-1">
                    {cycle.niveaux.map(nv => {
                      const key = `${sec.id}::${nv.code}`
                      const created = isNiveauCreated(sec.id, nv.nomDefaut)
                      return (
                        <label key={nv.code} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${created ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            disabled={created}
                            checked={selectedNiveaux.has(key)}
                            onChange={() => toggleNiveau(sec.id, nv.code)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">{nv.nomDefaut}</span>
                          <span className="text-xs text-slate-400">{nv.label}</span>
                          {created && <Badge variant="success" size="sm">{t('list.exists')}</Badge>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={handleBulkCreate}
          disabled={saving || selectedNiveaux.size === 0}
          className="w-full btn-primary"
        >
          {saving ? t('list.creating') : t('list.createCount', { count: selectedNiveaux.size })}
        </button>
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('list.modalNewTitle')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('list.fields.section')}</label>
            <select value={form.section} onChange={e => { up('section', e.target.value); up('niveau', '') }} className="input-field">
              <option value="francophone">{te.section('francophone')}</option>
              <option value="anglophone">{te.section('anglophone')}</option>
              <option value="maternelle">{te.section('maternelle')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('list.fields.level')}</label>
            <select value={form.niveau} onChange={e => {
              const sec = CAMEROON_SECTIONS.find(s => s.id === form.section)
              const nv = sec?.cycles.flatMap(c => c.niveaux).find(n => n.code === e.target.value)
              up('niveau', e.target.value)
              if (nv) up('nom', nv.nomDefaut)
            }} className="input-field">
              <option value="">{t('list.fields.chooseLevel')}</option>
              {CAMEROON_SECTIONS.find(s => s.id === form.section)?.cycles.flatMap(c =>
                c.niveaux.map(nv => (
                  <option key={nv.code} value={nv.code}>{nv.nomDefaut} — {nv.label}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('list.fields.className')}</label>
            <input value={form.nom} onChange={e => up('nom', e.target.value)}
              placeholder={t('list.fields.classNamePlaceholder')}
              className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('list.fields.schoolYear')}</label>
              <input value={form.annee_scolaire} onChange={e => up('annee_scolaire', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('list.fields.maxCapacity')}</label>
              <input type="number" value={form.capacite_max} onChange={e => up('capacite_max', e.target.value)} className="input-field" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving || !form.nom} className="w-full btn-primary">
            {saving ? t('list.creating') : t('list.createClass')}
          </button>
        </div>
      </Modal>

      {loading ? (
        <div className="card p-16 text-center text-slate-400">{tc('loading')}</div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={School}
          title={t('list.emptyTitle')}
          description={t('list.emptyDescription')}
          action={
            canCreateClass ? (
              <button onClick={() => setShowReferentiel(true)} className="btn-primary">
                {t('list.emptyAction')}
              </button>
            ) : undefined
          }
        />
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('list.noMatchTitle')}
          description={t('list.noMatchDescription')}
          action={
            <button onClick={reset} className="btn-secondary">
              {t('list.resetFilters')}
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {te.section(section)}
                <span className="text-slate-400 font-normal normal-case">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(c => {
                  const taux = c.capacite_max > 0 ? Math.round((c.nb_eleves / c.capacite_max) * 100) : 0
                  const plein = c.nb_eleves >= c.capacite_max
                  return (
                    <Link
                      key={c.id}
                      href={`/${slug}/classes/${c.id}`}
                      className="card p-5 hover:shadow-md hover:border-emerald-300 border border-transparent transition-all group block"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{c.nom}</h3>
                          {c.niveau && c.niveau !== c.nom && (
                            <p className="text-xs text-slate-400 mt-0.5">{c.niveau}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                      </div>
                      <p className="text-sm text-slate-400 mb-4">{c.annee_scolaire}</p>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-slate-600 mb-1.5">
                          <span className="font-medium">{t('list.studentsCount', { count: c.nb_eleves })}</span>
                          <span>{t('list.places', { count: c.capacite_max })}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${plein ? 'bg-red-500' : taux > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(taux, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100" onClick={e => e.preventDefault()}>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                          <UserCheck className="w-3.5 h-3.5" /> {t('list.titulaire')}
                        </label>
                        <select
                          value={c.personnel_id || ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); handleAssignEnseignant(c.id, e.target.value) }}
                          className="input-field text-sm py-2"
                        >
                          <option value="">
                            {c.enseignant_nom ? `${c.enseignant_nom}${c.enseignant_prenom ? ` ${c.enseignant_prenom}` : ''}` : t('list.notAssigned')}
                          </option>
                          {enseignants.filter(en => en.id !== c.personnel_id).map(en => (
                            <option key={en.id} value={en.id}>
                              {en.nom}{en.prenom ? ` ${en.prenom}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {plein ? (
                          <Badge variant="danger">{t('list.full')}</Badge>
                        ) : taux > 80 ? (
                          <Badge variant="warning">{t('list.almostFull')}</Badge>
                        ) : (
                          <span className="text-sm text-slate-400">{t('list.available', { pct: 100 - taux })}</span>
                        )}
                        <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          {tc('viewDetails')}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
