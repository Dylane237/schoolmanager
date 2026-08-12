'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Plus, Megaphone, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useTranslatedEnums } from '@/hooks/useTranslatedEnums'

interface Annonce {
  id: string
  titre: string
  contenu: string
  cible: string
  priorite: string
  auteur_nom: string
  date_publication: string
  date_expiration: string | null
  is_active: number
}

const CIBLE_VALUES = ['tous', 'personnel', 'parents', 'enseignants'] as const
const PRIORITE_VALUES = ['normale', 'importante', 'urgente'] as const

const PRIORITE_VARIANT: Record<string, 'default' | 'warning' | 'danger'> = {
  normale: 'default',
  importante: 'warning',
  urgente: 'danger',
}

export default function AnnoncesPage() {
  const t = useTranslations('annonces')
  const tc = useTranslations('common')

  return (
    <Suspense fallback={
      <PageShell title={t('title')} breadcrumb={t('breadcrumb')}>
        <div className="card p-12 text-center text-slate-400">{tc('loading')}</div>
      </PageShell>
    }>
      <AnnoncesPageContent />
    </Suspense>
  )
}

function AnnoncesPageContent() {
  const locale = useLocale()
  const t = useTranslations('annonces')
  const tc = useTranslations('common')
  const tf = useTranslations('filters')
  const te = useTranslatedEnums()

  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const filterFields = useMemo(() => [
    { key: 'q', type: 'search' as const, placeholder: t('searchPlaceholder'), debounce: true },
    {
      key: 'cible',
      type: 'pills' as const,
      label: tf('labels.recipients'),
      options: CIBLE_VALUES.map(value => ({ value, label: te.announcementTarget(value) })),
      defaultValue: 'tous',
    },
    {
      key: 'priorite',
      type: 'pills' as const,
      label: tf('labels.priority'),
      options: [
        { value: 'tous', label: tf('allFeminine') },
        ...PRIORITE_VALUES.map(value => ({ value, label: te.announcementPriority(value) })),
      ],
      defaultValue: 'tous',
    },
    {
      key: 'etat',
      type: 'select' as const,
      label: tf('labels.state'),
      options: [
        { value: 'tous', label: tf('allFeminine') },
        { value: 'actives', label: tf('announcements.active') },
        { value: 'masquees', label: tf('announcements.hidden') },
        { value: 'expirees', label: tf('announcements.expired') },
      ],
      defaultValue: 'actives',
    },
  ], [t, tf, te])

  const { values, debouncedValues, setFilter, reset, activeFilters } = useSmartFilters(filterFields)

  const filteredAnnonces = useMemo(() => {
    let list = annonces
    const q = debouncedValues.q?.toLowerCase().trim()
    if (q) {
      list = list.filter(a =>
        `${a.titre} ${a.contenu} ${a.auteur_nom}`.toLowerCase().includes(q)
      )
    }
    if (debouncedValues.cible && debouncedValues.cible !== 'tous') {
      list = list.filter(a => a.cible === debouncedValues.cible || a.cible === 'tous')
    }
    if (debouncedValues.priorite && debouncedValues.priorite !== 'tous') {
      list = list.filter(a => a.priorite === debouncedValues.priorite)
    }
    const etat = debouncedValues.etat
    const now = new Date()
    if (etat === 'actives') {
      list = list.filter(a => a.is_active && (!a.date_expiration || new Date(a.date_expiration) >= now))
    } else if (etat === 'masquees') {
      list = list.filter(a => !a.is_active)
    } else if (etat === 'expirees') {
      list = list.filter(a => a.date_expiration && new Date(a.date_expiration) < now)
    }
    return list
  }, [annonces, debouncedValues])

  const [form, setForm] = useState({
    titre: '', contenu: '', cible: 'tous', priorite: 'normale', date_expiration: '',
  })

  const fetchAnnonces = async () => {
    setLoading(true)
    const res = await fetch('/api/annonces')
    const data = await res.json()
    setAnnonces(data.annonces || [])
    setLoading(false)
  }

  useEffect(() => { fetchAnnonces() }, [])

  const handleCreate = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) {
      toast.error(t('toasts.required'))
      return
    }
    setSaving(true)
    const res = await fetch('/api/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error(t('toasts.publishError'))
      setSaving(false)
      return
    }
    toast.success(t('toasts.published'))
    setShowForm(false)
    setForm({ titre: '', contenu: '', cible: 'tous', priorite: 'normale', date_expiration: '' })
    await fetchAnnonces()
    setSaving(false)
  }

  const toggleActive = async (id: string, is_active: number) => {
    await fetch('/api/annonces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !is_active }),
    })
    await fetchAnnonces()
    toast.success(is_active ? t('toasts.hidden') : t('toasts.reactivated'))
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/annonces?id=${id}`, { method: 'DELETE' })
    await fetchAnnonces()
    toast.success(t('toasts.deleted'))
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

  return (
    <PageShell
      title={t('title')}
      subtitle={t('subtitle')}
      breadcrumb={t('breadcrumb')}
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" /> {t('new')}
        </button>
      }
    >
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('publishTitle')} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fields.title')}</label>
            <input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
              placeholder={t('fields.titlePlaceholder')}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fields.content')}</label>
            <textarea value={form.contenu} onChange={e => setForm(p => ({ ...p, contenu: e.target.value }))}
              rows={5} placeholder={t('fields.contentPlaceholder')}
              className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fields.recipients')}</label>
              <select value={form.cible} onChange={e => setForm(p => ({ ...p, cible: e.target.value }))} className="input-field">
                {CIBLE_VALUES.map(value => (
                  <option key={value} value={value}>{te.announcementTarget(value)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fields.priority')}</label>
              <select value={form.priorite} onChange={e => setForm(p => ({ ...p, priorite: e.target.value }))} className="input-field">
                {PRIORITE_VALUES.map(value => (
                  <option key={value} value={value}>{te.announcementPriority(value)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('fields.expiration')}</label>
            <input type="date" value={form.date_expiration}
              onChange={e => setForm(p => ({ ...p, date_expiration: e.target.value }))}
              className="input-field" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full btn-primary">
            {saving ? t('publishing') : t('publish')}
          </button>
        </div>
      </Modal>

      <SmartFilterBar
        fields={filterFields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={filteredAnnonces.length}
        resultLabel={t('resultLabel')}
        loading={loading}
        className="mb-6"
      />

      {loading ? (
        <div className="card p-16 text-center text-slate-400">{tc('loading')}</div>
      ) : annonces.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              {t('emptyAction')}
            </button>
          }
        />
      ) : filteredAnnonces.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t('noMatchTitle')}
          description={t('noMatchDescription')}
        />
      ) : (
        <div className="space-y-4">
          {filteredAnnonces.map(a => (
            <article key={a.id}
              className={`card p-6 transition-all ${!a.is_active ? 'opacity-60' : ''} ${
                a.priorite === 'urgente' ? 'border-red-200' : a.priorite === 'importante' ? 'border-amber-200' : ''
              }`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant={PRIORITE_VARIANT[a.priorite] ?? 'default'}>
                      {te.announcementPriority(a.priorite)}
                    </Badge>
                    <Badge variant="info">{te.announcementTarget(a.cible)}</Badge>
                    {!a.is_active && <Badge variant="neutral">{t('hidden')}</Badge>}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{a.titre}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(a.date_publication)} · {a.auteur_nom || t('authorDefault')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(a.id, a.is_active)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title={a.is_active ? t('hide') : t('show')}>
                    {a.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{a.contenu}</p>
              {a.date_expiration && (
                <p className="text-sm text-slate-400 mt-3">{t('expiresOn', { date: formatDate(a.date_expiration) })}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  )
}
