'use client'

import { Building2, KeyRound, AlertTriangle } from 'lucide-react'
import { AdminBadge } from '@/components/admin-licences/AdminShell'
import {
  type AdminLicence,
  resolveEcoleNom,
  resolveEcoleSlug,
  hasSchoolName,
  isLicenceAssigned,
  schoolInitials,
  PLAN_COLORS,
} from '@/lib/admin-licences-types'

export function SchoolIdentity({
  licence,
  compact = false,
  onEdit,
}: {
  licence: AdminLicence
  compact?: boolean
  onEdit?: () => void
}) {
  const assigned = isLicenceAssigned(licence)
  const name = resolveEcoleNom(licence)
  const slug = resolveEcoleSlug(licence)
  const named = hasSchoolName(licence)
  const planClass = PLAN_COLORS[licence.type] ?? PLAN_COLORS.standard

  if (!assigned) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5 text-violet-400" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-violet-300">Clé disponible</p>
          <p className="text-xs text-slate-500">En attente d&apos;inscription sur /register</p>
        </div>
      </div>
    )
  }

  const avatarSize = compact ? 'w-9 h-9 rounded-lg text-xs' : 'w-10 h-10 rounded-xl text-sm'

  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className={`${avatarSize} shrink-0 flex items-center justify-center font-bold border ${
        named
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      }`}>
        {name ? schoolInitials(name) : <Building2 className="w-4 h-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold truncate ${named ? 'text-white' : 'text-amber-200'}`}>
            {name ?? 'Établissement non synchronisé'}
          </p>
          {!named && (
            <AdminBadge tone="warning">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Nom manquant
              </span>
            </AdminBadge>
          )}
        </div>
        {slug && (
          <p className="text-xs text-slate-500 font-mono truncate mt-0.5">/{slug}</p>
        )}
        {!compact && licence.directeur_nom && (
          <p className="text-xs text-slate-400 mt-1">Directeur · {licence.directeur_nom}</p>
        )}
        {!compact && licence.telephone && (
          <p className="text-[11px] text-slate-600 mt-0.5">{licence.telephone}</p>
        )}
        <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${planClass}`}>
          {licence.type}
        </span>
        {onEdit && !named && (
          <button
            type="button"
            onClick={onEdit}
            className="block mt-2 text-xs text-emerald-400 hover:underline"
          >
            Renseigner l&apos;établissement →
          </button>
        )}
      </div>
    </div>
  )
}
