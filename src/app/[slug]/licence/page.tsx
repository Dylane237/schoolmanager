'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Key, Users, Calendar, AlertTriangle, CheckCircle2,
  ArrowUpCircle, RefreshCw, Sparkles, Crown, Zap,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import AppUpdates from '@/components/parametres/AppUpdates'
import SupportTools from '@/components/parametres/SupportTools'
import ReferralProgram from '@/components/licence/ReferralProgram'
import { WhatsAppSupportLink } from '@/components/support/whatsapp-support-link'
import { useSchool } from '@/components/layout/SchoolProvider'
import { useLicenceStatus } from '@/hooks/useLicenceStatus'
import toast from 'react-hot-toast'
import { getSupportWhatsAppUrl } from '@/lib/support'
import {
  PLAN_LABELS, PLAN_PRICES, PLAN_STUDENT_LIMITS, type LicencePlan,
} from '@/lib/licence-constants'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const PLAN_ICONS: Record<LicencePlan, typeof Shield> = {
  starter: Shield,
  standard: Zap,
  premium: Crown,
}

const PLAN_GRADIENT: Record<LicencePlan, string> = {
  starter: 'from-slate-700 via-slate-800 to-slate-900',
  standard: 'from-blue-700 via-indigo-800 to-slate-900',
  premium: 'from-emerald-600 via-teal-700 to-slate-900',
}

const PLAN_ACCENT: Record<LicencePlan, string> = {
  starter: 'text-slate-300',
  standard: 'text-blue-200',
  premium: 'text-emerald-200',
}

function DaysRing({ daysLeft, totalDays = 365 }: { daysLeft: number; totalDays?: number }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100))
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = daysLeft <= 7 ? '#ef4444' : daysLeft <= 30 ? '#f59e0b' : '#10b981'

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white leading-none">{Math.max(0, daysLeft)}</span>
        <span className="text-[10px] text-white/60 uppercase tracking-wide">jours</span>
      </div>
    </div>
  )
}

export default function LicencePage() {
  const router = useRouter()
  const { userRole } = useSchool()
  const { status, loading, refresh } = useLicenceStatus()
  const [renewKey, setRenewKey] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [showRenew, setShowRenew] = useState(false)

  const canRenew = userRole === 'admin' || userRole === 'super_admin'
  const plan = status?.plan
  const daysLeft = status?.daysLeft ?? null
  const expired = daysLeft !== null && daysLeft < 0
  const urgent = daysLeft !== null && daysLeft <= 30 && !expired

  const handleRenew = async () => {
    const cle = renewKey.trim()
    if (!cle) return
    setRenewing(true)
    try {
      const res = await fetch('/api/licence/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cle }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Renouvellement échoué')
        return
      }
      toast.success('Licence renouvelée avec succès')
      setRenewKey('')
      setShowRenew(false)
      await refresh()
      router.refresh()
    } catch {
      toast.error('Erreur réseau — réessayez')
    } finally {
      setRenewing(false)
    }
  }

  const whatsappMsg = plan
    ? `Bonjour, je souhaite renouveler ou upgrader ma licence SchoolManager (plan ${plan}).`
    : 'Bonjour, j\'ai besoin d\'aide avec ma licence SchoolManager.'

  const PlanIcon = plan ? PLAN_ICONS[plan] : Shield
  const gradient = plan ? PLAN_GRADIENT[plan] : PLAN_GRADIENT.starter

  if (loading) {
    return (
      <PageShell title="Licence & Abonnement" subtitle="" breadcrumb="Licence">
        <div className="flex items-center justify-center h-64 text-slate-400">Chargement...</div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Licence & Abonnement"
      subtitle="Gérez votre plan, suivez votre quota et renouvelez en toute simplicité"
      breadcrumb="Licence"
      fullWidth
    >
      <div className="space-y-6 max-w-6xl">

        {/* Hero */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 lg:p-8 shadow-xl`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {status?.active ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Licence active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300 bg-red-500/20 border border-red-400/30 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" /> Inactive
                  </span>
                )}
                {urgent && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2.5 py-1 rounded-full">
                    Renouvellement bientôt
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <PlanIcon className={`w-6 h-6 ${plan ? PLAN_ACCENT[plan] : 'text-white'}`} />
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white">
                    {status?.planLabel?.split('—')[0]?.trim() || 'Votre plan'}
                  </h2>
                  <p className={`text-sm ${plan ? PLAN_ACCENT[plan] : 'text-slate-300'}`}>
                    {status?.planPrice
                      ? `${status.planPrice.toLocaleString('fr-FR')} FCFA / an`
                      : 'Abonnement annuel'}
                  </p>
                </div>
              </div>

              <p className="text-white/60 text-sm mt-3 max-w-md">
                Valide jusqu&apos;au <strong className="text-white/90">{formatDate(status?.dateFin ?? null)}</strong>
                {status?.cleMasked && (
                  <> · Clé <code className="font-mono text-white/80 bg-white/10 px-1.5 py-0.5 rounded text-xs">{status.cleMasked}</code></>
                )}
              </p>
            </div>

            {daysLeft !== null && daysLeft >= 0 && (
              <DaysRing daysLeft={daysLeft} />
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Quota + validité */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quota élèves</p>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {status?.studentCount ?? 0}
                  <span className="text-lg font-normal text-slate-400">
                    {status?.studentLimit ? ` / ${status.studentLimit}` : ' / ∞'}
                  </span>
                </p>
                {status?.studentLimit && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Utilisation</span>
                      <span>{status.usagePercent ?? 0}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (status.usagePercent ?? 0) >= 90 ? 'bg-red-500'
                            : (status.usagePercent ?? 0) >= 75 ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${status.usagePercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {!status?.studentLimit && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Élèves illimités
                  </p>
                )}
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Période</p>
                </div>
                <p className="text-sm text-slate-600">
                  Depuis le <strong className="text-slate-800">{formatDate(status?.dateDebut ?? null)}</strong>
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Jusqu&apos;au <strong className="text-slate-800">{formatDate(status?.dateFin ?? null)}</strong>
                </p>
                <p className={`text-lg font-bold mt-2 ${
                  expired ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {expired
                    ? 'Licence expirée'
                    : daysLeft !== null
                      ? `${daysLeft} jour${daysLeft !== 1 ? 's' : ''} restant${daysLeft !== 1 ? 's' : ''}`
                      : '—'}
                </p>
              </div>
            </div>

            {/* Plans comparison */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Comparer les plans</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tous les plans incluent mises à jour et support</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {(['starter', 'standard', 'premium'] as LicencePlan[]).map(p => {
                  const Icon = PLAN_ICONS[p]
                  const isCurrent = plan === p
                  return (
                    <div
                      key={p}
                      className={`p-5 ${isCurrent ? 'bg-emerald-50/50' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${isCurrent ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-800 capitalize">{p}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Actuel
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{PLAN_LABELS[p].split('—')[1]?.trim()}</p>
                      <p className="text-lg font-bold text-slate-800">
                        {PLAN_PRICES[p].toLocaleString('fr-FR')}
                        <span className="text-xs font-normal text-slate-400"> FCFA/an</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {PLAN_STUDENT_LIMITS[p] ? `${PLAN_STUDENT_LIMITS[p]} élèves max` : 'Illimité'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Actions sidebar */}
          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-slate-800">Besoin d&apos;aide ?</h3>
              <WhatsAppSupportLink message={whatsappMsg} />

              {plan && plan !== 'premium' && (
                <a
                  href={getSupportWhatsAppUrl(
                    `Bonjour, je souhaite passer au plan supérieur (actuellement ${plan}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-violet-200 text-violet-700 font-semibold rounded-xl px-4 py-3 hover:bg-violet-50 transition-colors text-sm"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Upgrader mon plan
                </a>
              )}
            </div>

            {canRenew && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" /> Renouveler
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowRenew(v => !v)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {showRenew ? 'Fermer' : 'Saisir une clé'}
                  </button>
                </div>
                {!showRenew ? (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Après paiement, recevez votre nouvelle clé par WhatsApp ou email et activez-la ici.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={renewKey}
                      onChange={e => setRenewKey(e.target.value.toUpperCase())}
                      placeholder="SM-XXXX-XXXX-XXXX"
                      className="input-field font-mono uppercase tracking-wider text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRenew}
                      disabled={renewing || !renewKey.trim()}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                    >
                      {renewing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Vérification...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" /> Activer la clé
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <ReferralProgram />

        <SupportTools />

        <AppUpdates />
      </div>
    </PageShell>
  )
}
