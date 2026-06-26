import { cookies } from 'next/headers'
import Link from 'next/link'
import { verifyToken } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import PageShell from '@/components/layout/PageShell'
import {
  Users, DoorOpen, UserCheck, Banknote,
  CreditCard, ClipboardList, CheckSquare,
  UserPlus, TrendingUp, BookOpen, Calendar,
  AlertTriangle, Info, AlertCircle,
} from 'lucide-react'


type Alert = { level: 'danger' | 'warn' | 'info'; text: string; sub: string }

const STAT_STYLES = [
  { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600', trend: 'text-emerald-600' },
  { bar: 'bg-blue-500',    icon: 'bg-blue-100    text-blue-600',    trend: 'text-slate-400'   },
  { bar: 'bg-violet-500',  icon: 'bg-violet-100  text-violet-600',  trend: 'text-slate-400'   },
  { bar: 'bg-amber-500',   icon: 'bg-amber-100   text-amber-600',   trend: 'text-emerald-600' },
]

const MODULE_STYLES = [
  { icon: 'bg-emerald-100 text-emerald-600' },
  { icon: 'bg-amber-100   text-amber-600'   },
  { icon: 'bg-blue-100    text-blue-600'    },
  { icon: 'bg-violet-100  text-violet-600'  },
  { icon: 'bg-pink-100    text-pink-600'    },
  { icon: 'bg-teal-100    text-teal-600'    },
  { icon: 'bg-orange-100  text-orange-600'  },
  { icon: 'bg-indigo-100  text-indigo-600'  },
]
const MODULE_ICONS = [Users, CreditCard, DoorOpen, ClipboardList, BookOpen, CheckSquare, UserCheck, Calendar]

const ALERT_ICON: Record<Alert['level'], React.ElementType> = {
  danger: AlertCircle,
  warn:   AlertTriangle,
  info:   Info,
}
const ALERT_BG: Record<Alert['level'], string> = {
  danger: 'bg-red-100 text-red-500',
  warn:   'bg-amber-100 text-amber-500',
  info:   'bg-blue-100 text-blue-500',
}

const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  const nom    = payload.nom as string
  const prenom = payload.prenom as string | undefined
  const initials = ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase() || 'AD'

  const db = getDb()

  const ecole = db.prepare('SELECT * FROM ecoles WHERE slug = ?').get(slug) as { id: string; nom: string } | undefined
  if (!ecole) return null

  // ── stats ──
  const totalEleves = (db.prepare(
    'SELECT COUNT(*) as count FROM eleves WHERE ecole_id = ? AND statut = ?'
  ).get(ecole?.id, 'actif') as any)?.count ?? 0

  const totalClasses = (db.prepare(
    'SELECT COUNT(*) as count FROM classes WHERE ecole_id = ?'
  ).get(ecole?.id) as any)?.count ?? 0

  const totalPersonnel = (db.prepare(
    'SELECT COUNT(*) as count FROM personnel WHERE ecole_id = ?'
  ).get(ecole?.id) as any)?.count ?? 0

  const debutMois = new Date(); debutMois.setDate(1)
  const totalMois = (db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total FROM paiements
    WHERE ecole_id = ? AND date_paiement >= ?
  `).get(ecole.id, debutMois.toISOString().split('T')[0]) as { total: number })?.total ?? 0

  const debutMoisPrecedent = new Date(debutMois)
  debutMoisPrecedent.setMonth(debutMoisPrecedent.getMonth() - 1)
  const finMoisPrecedent = new Date(debutMois)
  finMoisPrecedent.setDate(0)
  const totalMoisPrecedent = (db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total FROM paiements
    WHERE ecole_id = ? AND date_paiement >= ? AND date_paiement <= ?
  `).get(
    ecole.id,
    debutMoisPrecedent.toISOString().split('T')[0],
    finMoisPrecedent.toISOString().split('T')[0],
  ) as { total: number })?.total ?? 0

  let trendCollecte = 'Aucun encaissement ce mois'
  let trendCollecteUp = false
  if (totalMoisPrecedent > 0) {
    const pct = Math.round(((totalMois - totalMoisPrecedent) / totalMoisPrecedent) * 100)
    trendCollecteUp = pct >= 0
    trendCollecte = `${pct >= 0 ? '+' : ''}${pct} % vs mois dernier`
  } else if (totalMois > 0) {
    trendCollecte = 'Premiers encaissements ce mois'
    trendCollecteUp = true
  }

  // ── alertes ──
  const classesVides = (db.prepare(`
    SELECT COUNT(*) as count FROM classes c WHERE c.ecole_id = ?
    AND (SELECT COUNT(*) FROM eleves e WHERE e.classe_id = c.id AND e.statut = 'actif') = 0
  `).get(ecole?.id) as any)?.count ?? 0

  const impayes = (db.prepare(`
    SELECT COUNT(*) as count FROM eleves e
    WHERE e.ecole_id = ? AND e.statut = 'actif'
    AND COALESCE((SELECT SUM(pa.montant) FROM paiements pa WHERE pa.eleve_id = e.id), 0)
      < COALESCE((SELECT SUM(tc.montant_attendu) FROM tranches_config tc WHERE tc.classe_id = e.classe_id), 0)
  `).get(ecole.id) as { count: number })?.count ?? 0

  const classesSansEnseignant = (db.prepare(`
    SELECT COUNT(*) as count FROM classes
    WHERE ecole_id = ? AND (personnel_id IS NULL OR personnel_id = '')
  `).get(ecole.id) as { count: number })?.count ?? 0

  const alerts: Alert[] = []
  if (classesVides > 0)
    alerts.push({ level: 'danger', text: `${classesVides} classe${classesVides > 1 ? 's' : ''} sans élèves inscrits`, sub: 'Classes — vérifier les inscriptions' })
  if (impayes > 0)
    alerts.push({ level: 'warn', text: `${impayes} élève${impayes > 1 ? 's' : ''} avec solde impayé`, sub: 'Paiements — Suivi des frais' })
  if (classesSansEnseignant > 0)
    alerts.push({ level: 'warn',   text: `${classesSansEnseignant} classe${classesSansEnseignant > 1 ? 's' : ''} sans enseignant affecté`, sub: 'Personnel — Affectations' })
  if (alerts.length === 0)
    alerts.push({ level: 'info',   text: 'Tout est en ordre', sub: `Mis à jour le ${new Date().toLocaleDateString('fr-FR')}` })

  // ── encaissements 6 derniers mois ──
  const encaissements6mois = db.prepare(`
    SELECT strftime('%Y-%m', date_paiement) as mois,
           COALESCE(SUM(montant), 0) as total
    FROM paiements WHERE ecole_id = ?
      AND date_paiement >= date('now', '-5 months', 'start of month')
    GROUP BY mois ORDER BY mois ASC
  `).all(ecole?.id) as { mois: string; total: number }[]

  // Remplir les mois manquants
  const chartData: { label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const found = encaissements6mois.find(r => r.mois === key)
    chartData.push({ label: MOIS_FR[d.getMonth()], total: found?.total ?? 0 })
  }

  // ── répartition modes paiement ──
  const repartitionModes = db.prepare(`
    SELECT mode_paiement, COALESCE(SUM(montant), 0) as total
    FROM paiements WHERE ecole_id = ?
    GROUP BY mode_paiement
  `).all(ecole?.id) as { mode_paiement: string; total: number }[]

  const totalGeneral = repartitionModes.reduce((s, r) => s + r.total, 0) || 1
  const modeConfig: Record<string, { label: string; color: string; bg: string }> = {
    especes:      { label: 'Espèces',      color: '#10b981', bg: 'bg-emerald-500' },
    orange_money: { label: 'Orange Money', color: '#f97316', bg: 'bg-orange-500'  },
    mtn_momo:     { label: 'MTN MoMo',     color: '#eab308', bg: 'bg-yellow-500'  },
    virement:     { label: 'Virement',     color: '#3b82f6', bg: 'bg-blue-500'    },
  }

  // ── derniers paiements ──
  const derniersPaiements = db.prepare(`
    SELECT p.montant, p.date_paiement, p.mode_paiement,
           e.nom as eleve_nom, e.prenom as eleve_prenom,
           c.nom as classe_nom
    FROM paiements p
    JOIN eleves e ON e.id = p.eleve_id
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE p.ecole_id = ?
    ORDER BY p.created_at DESC LIMIT 5
  `).all(ecole?.id) as any[]

  // ── licence ──
  const licence = db.prepare(
    'SELECT * FROM licences WHERE ecole_id = ? AND is_active = 1 ORDER BY date_fin DESC LIMIT 1'
  ).get(ecole?.id) as any

  const licenceColor: Record<string, string> = {
    starter:  'bg-slate-700 text-slate-200',
    standard: 'bg-blue-900  text-blue-200',
    premium:  'bg-emerald-600 text-white',
  }

  const stats = [
    { label: 'Élèves actifs',    value: totalEleves.toLocaleString('fr-FR'),         suffix: undefined, Icon: Users,    trend: `sur ${totalClasses} classe${totalClasses !== 1 ? 's' : ''}`, trendUp: false },
    { label: 'Classes',          value: totalClasses.toLocaleString('fr-FR'),         suffix: undefined, Icon: DoorOpen, trend: 'capacité moyenne : 60 élèves',                                 trendUp: false },
    { label: 'Personnel',        value: totalPersonnel.toLocaleString('fr-FR'),       suffix: undefined, Icon: UserCheck,trend: totalPersonnel === 0 ? 'Aucun staff enregistré' : 'membres actifs', trendUp: false },
    { label: 'Collecté ce mois', value: Number(totalMois).toLocaleString('fr-FR'), suffix: 'FCFA', Icon: Banknote, trend: trendCollecte, trendUp: trendCollecteUp },
  ]

  const modules = [
    { label: 'Élèves',    desc: 'Inscriptions & fiches',   href: `/${slug}/eleves`       },
    { label: 'Paiements', desc: 'Frais & reçus PDF',       href: `/${slug}/paiements`    },
    { label: 'Classes',   desc: 'Gestion des classes',     href: `/${slug}/classes`      },
    { label: 'Notes',     desc: 'Saisie & bulletins',      href: `/${slug}/notes/saisie` },
    { label: 'Bulletins', desc: 'Impression report cards',   href: `/${slug}/notes/bulletins` },
    { label: 'Présences', desc: "Registre d'appel",        href: `/${slug}/presences`    },
    { label: 'Personnel', desc: 'Staff & RH',              href: `/${slug}/personnel`    },
    { label: 'Annonces',  desc: 'Communications',          href: `/${slug}/annonces`     },
  ]

  const modeBadge: Record<string, string> = {
    especes:      'bg-emerald-100 text-emerald-700',
    orange_money: 'bg-orange-100  text-orange-700',
    mtn_momo:     'bg-yellow-100  text-yellow-700',
    virement:     'bg-blue-100    text-blue-700',
  }
  const modeLabel: Record<string, string> = {
    especes: 'Espèces', orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', virement: 'Virement',
  }

  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Calculs graphique barres
  const chartMax = Math.max(...chartData.map(d => d.total), 1)

  // SVG donut
  const donutData = repartitionModes.map(r => ({
    ...r,
    pct: r.total / totalGeneral,
    cfg: modeConfig[r.mode_paiement] ?? { label: r.mode_paiement, color: '#94a3b8', bg: 'bg-slate-400' },
  }))
  const DONUT_R = 54; const DONUT_CX = 70; const DONUT_CY = 70
  const circumference = 2 * Math.PI * DONUT_R
  let donutOffset = 0
  const donutSlices = donutData.map(d => {
    const dash = d.pct * circumference
    const gap  = circumference - dash
    const rot  = donutOffset * 360
    donutOffset += d.pct
    return { ...d, dash, gap, rot }
  })
  const donutEmpty = donutData.length === 0

  return (
    <PageShell
      title={`Bonjour, ${prenom ?? nom}`}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          {ecole?.nom} — {dateStr}
        </span>
      }
      breadcrumb="Tableau de bord"
      actions={
        <Link
          href={`/${slug}/eleves/nouveau`}
          className="btn-primary flex items-center gap-2 py-2.5"
        >
          <UserPlus size={17} />
          Inscrire un élève
        </Link>
      }
    >
      <div className="flex flex-col gap-7">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => {
            const s = STAT_STYLES[i]; const Icon = stat.Icon
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className={`h-1.5 ${s.bar}`} />
                <div className="p-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${s.icon}`}>
                    <Icon size={22} />
                  </div>
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-4xl font-bold text-slate-800 leading-none">
                    {stat.value}
                    {stat.suffix && <span className="text-base font-normal text-slate-400 ml-2">{stat.suffix}</span>}
                  </p>
                  <p className={`text-sm mt-2.5 flex items-center gap-1 ${s.trend}`}>
                    {stat.trendUp && <TrendingUp size={13} />}
                    {stat.trend}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* barres — encaissements 6 mois */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Encaissements</p>
                <p className="text-lg font-semibold text-slate-800">6 derniers mois</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 rounded-lg px-3 py-1.5">FCFA</span>
            </div>

            <div className="flex items-end gap-3 h-44">
              {chartData.map((d, i) => {
                const pct = chartMax > 0 ? d.total / chartMax : 0
                const isLast = i === chartData.length - 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <p className="text-xs text-slate-500 font-medium">
                      {d.total > 0 ? (d.total >= 1000 ? `${Math.round(d.total / 1000)}k` : d.total) : ''}
                    </p>
                    <div className="w-full flex items-end" style={{ height: '120px' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isLast ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        style={{ height: `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">{d.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* donut — répartition modes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Répartition</p>
            <p className="text-lg font-semibold text-slate-800 mb-5">Modes de paiement</p>

            <div className="flex items-center gap-6 flex-1">
              {/* donut SVG */}
              <div className="flex-shrink-0">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {donutEmpty ? (
                    <circle cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R} fill="none" stroke="#e2e8f0" strokeWidth="18" />
                  ) : (
                    donutSlices.map((s, i) => (
                      <circle
                        key={i}
                        cx={DONUT_CX} cy={DONUT_CY} r={DONUT_R}
                        fill="none"
                        stroke={s.cfg.color}
                        strokeWidth="18"
                        strokeDasharray={`${s.dash} ${s.gap}`}
                        strokeDashoffset={-((donutSlices.slice(0, i).reduce((a, c) => a + c.dash, 0)) - circumference / 4)}
                        style={{ transform: 'rotate(-90deg)', transformOrigin: `${DONUT_CX}px ${DONUT_CY}px` }}
                      />
                    ))
                  )}
                  <text x={DONUT_CX} y={DONUT_CY - 6} textAnchor="middle" fontSize="13" fill="#1e293b" fontWeight="700">
                    {repartitionModes.length}
                  </text>
                  <text x={DONUT_CX} y={DONUT_CY + 10} textAnchor="middle" fontSize="10" fill="#94a3b8">
                    {repartitionModes.length > 1 ? 'modes' : 'mode'}
                  </text>
                </svg>
              </div>

              {/* légende */}
              <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                {donutEmpty ? (
                  <p className="text-sm text-slate-400">Aucun paiement</p>
                ) : (
                  donutSlices.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.cfg.bg}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{s.cfg.label}</p>
                        <p className="text-xs text-slate-400">{Math.round(s.pct * 100)} %</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* modules + alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Modules</h2>
            <div className="grid grid-cols-3 gap-3">
              {modules.map((mod, i) => {
                const Icon = MODULE_ICONS[i]; const s = MODULE_STYLES[i]
                return (
                  <Link key={i} href={mod.href}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-sm transition-all group flex flex-col gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.icon}`}>
                      <Icon size={19} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight">{mod.label}</p>
                      <p className="text-sm text-slate-400 leading-tight mt-0.5">{mod.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* alertes */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Alertes & rappels</h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 flex-1">
              {alerts.map((a, i) => {
                const Icon = ALERT_ICON[a.level]
                return (
                  <div key={i} className="flex items-start gap-3.5 p-5">
                    <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ALERT_BG[a.level]}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700 leading-snug font-medium">{a.text}</p>
                      <p className="text-xs text-slate-400 mt-1">{a.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* derniers paiements + accès rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* tableau paiements */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Derniers paiements</h2>
              <Link href={`/${slug}/paiements`} className="text-xs text-emerald-600 hover:underline font-medium">Voir tout</Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {derniersPaiements.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">Aucun paiement enregistré pour l'instant.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Élève</th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Classe</th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Mode</th>
                      <th className="text-right text-xs font-semibold text-slate-400 px-5 py-3">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {derniersPaiements.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{p.eleve_prenom} {p.eleve_nom}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{p.classe_nom ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${modeBadge[p.mode_paiement] ?? 'bg-slate-100 text-slate-500'}`}>
                            {modeLabel[p.mode_paiement] ?? p.mode_paiement}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold text-slate-800 text-right">
                          {Number(p.montant).toLocaleString('fr-FR')} <span className="font-normal text-slate-400 text-xs">FCFA</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* accès rapides */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accès rapides</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Nouveau paiement',  desc: 'Enregistrer un règlement',     href: `/${slug}/paiements/nouveau`, Icon: CreditCard,  color: 'text-amber-600  bg-amber-100'  },
                { label: 'Saisir des notes',  desc: 'Notes de la période en cours', href: `/${slug}/notes/saisie`,      Icon: BookOpen,    color: 'text-violet-600 bg-violet-100' },
                { label: "Faire l'appel",     desc: 'Registre de présences',        href: `/${slug}/presences`,         Icon: CheckSquare, color: 'text-teal-600   bg-teal-100'   },
                { label: 'Paramètres école',  desc: 'Configuration & profil',       href: `/${slug}/parametres`,        Icon: Calendar,    color: 'text-blue-600   bg-blue-100'   },
              ].map(({ label, desc, href, Icon, color }, i) => (
                <Link key={i} href={href}
                  className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-emerald-400 hover:shadow-sm transition-all group flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  )
}