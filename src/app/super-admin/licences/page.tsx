'use client'

import Link from 'next/link'
import { ExternalLink, KeyRound, Info } from 'lucide-react'

const CLOUD_ADMIN_URL = 'https://schoolmanager-eosin.vercel.app/admin-licences'

export default function SuperAdminLicencesPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Licences — administration cloud</h1>
        <p className="text-slate-500 mt-1">
          La gestion des clés pool et parrainages se fait désormais sur la console éditeur en ligne.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Console éditeur (Supabase)</p>
            <p className="text-sm text-emerald-800/80 mt-1 leading-relaxed">
              Générez des clés pool, suivez les établissements activés, gérez les parrainages et révoquez
              des licences — le tout synchronisé avec les inscriptions desktop.
            </p>
          </div>
        </div>
        <a
          href={CLOUD_ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
        >
          Ouvrir l&apos;admin cloud
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 flex gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-2">
          <p>
            Cette installation locale conserve les licences <strong>activées sur ce poste</strong> dans SQLite.
            Les clés pool à distribuer se créent uniquement en cloud.
          </p>
          <p>
            Vue locale des écoles inscrites sur cette machine :{' '}
            <Link href="/super-admin/ecoles" className="text-emerald-600 hover:underline">Écoles</Link>
            {' · '}
            <Link href="/super-admin/dashboard" className="text-emerald-600 hover:underline">Tableau de bord</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
