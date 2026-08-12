'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface Ecole {
  id: string
  nom: string
  slug: string
  nb_eleves: number
  licence_active: number
  licence_type: string
  licence_fin: string
}

export default function EcolesPage() {
  const t = useTranslations('superAdmin')
  const tc = useTranslations('common')
  const [ecoles, setEcoles] = useState<Ecole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/super-admin/stats')
      .then(r => r.json())
      .then(data => {
        setEcoles(data.ecoles || [])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('schools.title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('schools.subtitle', { count: ecoles.length })}</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">{tc('loading')}</div>
      ) : ecoles.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          {t('schools.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ecoles.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800">{e.nom}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{e.slug}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  e.licence_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {e.licence_active
                    ? t('dashboard.licenceStatus.active')
                    : t('dashboard.licenceStatus.inactive')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('schools.students')}</span>
                  <span className="font-semibold text-slate-800">{e.nb_eleves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('schools.plan')}</span>
                  <span className="font-semibold text-slate-800 capitalize">{e.licence_type || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('schools.expiration')}</span>
                  <span className="font-semibold text-slate-800">{e.licence_fin || '—'}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link href={`/${e.slug}/dashboard`}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  {t('schools.accessDashboard')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
