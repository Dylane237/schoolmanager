'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Building2 } from 'lucide-react'
import type { AdminLicence } from '@/lib/admin-licences-types'
import { resolveEcoleNom, resolveEcoleSlug } from '@/lib/admin-licences-types'

export function EditSchoolModal({
  licence,
  onClose,
  onSaved,
}: {
  licence: AdminLicence
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('adminLicences.editSchoolModal')
  const [nom, setNom] = useState(resolveEcoleNom(licence) ?? '')
  const [slug, setSlug] = useState(resolveEcoleSlug(licence) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30'

  const save = async () => {
    if (!nom.trim()) {
      setError(t('nameRequired'))
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin-licences/update-meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: licence.id,
        ecole_nom: nom.trim(),
        ecole_slug: slug.trim() || undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || t('error'))
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('title')}</h3>
            <p className="text-xs text-slate-500 font-mono truncate max-w-[240px]">{licence.cle_licence}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('schoolName')}</label>
            <input value={nom} onChange={e => setNom(e.target.value)} placeholder={t('schoolNamePlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('slug')}</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder={t('slugPlaceholder')} className={inputClass} />
          </div>
        </div>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">{t('cancel')}</button>
          <button type="button" onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
