import { cookies } from 'next/headers'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { verifyToken } from '@/lib/auth'
import { prepareSchoolDb } from '@/lib/school-db'
import { getDb } from '@/lib/db-server'
import { getElevesSituation } from '@/lib/paiements-utils'
import { studentLinks } from '@/lib/student-context-links'
import { getIntlLocale, type Locale } from '@/i18n/config'
import PageShell from '@/components/layout/PageShell'
import EncaissementsChart from '@/components/dashboard/EncaissementsChart'
import ClassesPaiementChart from '@/components/dashboard/ClassesPaiementChart'
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


export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const t = await getTranslations('dashboard')
  const tCommon = await getTranslations('common')
  const locale = (await getLocale()) as Locale
  const intlLocale = getIntlLocale(locale)

  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null

  if (process.env.VERCEL && payload.ecole_slug) {
    await prepareSchoolDb(payload.ecole_slug)
  }

  const nom    = payload.nom as string
  const prenom = payload.prenom as string | undefined
  const initials = ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase() || 'AD'

  const db = getDb(slug)

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

  let trendCollecte = t('stats.noCollection')
  let trendCollecteUp = false
  if (totalMoisPrecedent > 0) {
    const pct = Math.round(((totalMois - totalMoisPrecedent) / totalMoisPrecedent) * 100)
    trendCollecteUp = pct >= 0
    trendCollecte = t('stats.trendVsLastMonth', { pct: `${pct >= 0 ? '+' : ''}${pct}` })
  } else if (totalMois > 0) {
    trendCollecte = t('stats.firstCollection')
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
    alerts.push({ level: 'danger', text: t('alerts.emptyClasses', { count: classesVides }), sub: t('alerts.emptyClassesSub') })
  if (impayes > 0)
    alerts.push({ level: 'warn', text: t('alerts.unpaid', { count: impayes }), sub: t('alerts.unpaidSub') })
  if (classesSansEnseignant > 0)
    alerts.push({ level: 'warn', text: t('alerts.noTeacher', { count: classesSansEnseignant }), sub: t('alerts.noTeacherSub') })
  if (alerts.length === 0)
    alerts.push({
      level: 'info',
      text: t('alerts.allGood'),
      sub: t('alerts.updatedOn', { date: new Date().toLocaleDateString(intlLocale) }),
    })

  // ── taux d'élèves à jour dans leurs paiements, par classe ──
  // S'appuie sur la même logique métier que la page paiements
  // (getElevesSituation) pour rester cohérent avec le badge "impayés" déjà
  // affiché ailleurs, plutôt que de recalculer un critère différent ici.
  // Les élèves "non_configure" (aucune tranche définie pour leur classe)
  // sont exclus du calcul plutôt que comptés comme impayés, car il n'y a
  // rien à leur reprocher si la classe n'a pas encore de tranches.
  const { situations } = getElevesSituation(db, ecole?.id ?? '')
  const classesPaiementMap = new Map<string, { classe: string; effectif: number; payes: number }>()
  for (const s of situations) {
    if (!s.classe_id || s.statut === 'non_configure') continue
    const entry = classesPaiementMap.get(s.classe_id) ?? { classe: s.classe_nom ?? '—', effectif: 0, payes: 0 }
    entry.effectif += 1
    if (s.statut === 'paye') entry.payes += 1
    classesPaiementMap.set(s.classe_id, entry)
  }
  const classesPaiement = Array.from(classesPaiementMap.values())
    .map(c => ({ ...c, pct: c.effectif > 0 ? Math.round((c.payes / c.effectif) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct)

  const capaciteMoyenne = totalClasses > 0
    ? Math.round((db.prepare('SELECT COALESCE(AVG(capacite_max), 60) as avg FROM classes WHERE ecole_id = ?').get(ecole?.id) as { avg: number }).avg)
    : 60

  // ── derniers paiements ──
  const derniersPaiements = db.prepare(`
    SELECT p.montant, p.date_paiement, p.mode_paiement,
           e.id as eleve_id, e.nom as eleve_nom, e.prenom as eleve_prenom,
           e.numero_matricule,
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
    { label: t('stats.activeStudents'), value: totalEleves.toLocaleString(intlLocale), suffix: undefined, Icon: Users, trend: t('stats.inClasses', { count: totalClasses }), trendUp: false },
    { label: t('stats.classes'), value: totalClasses.toLocaleString(intlLocale), suffix: undefined, Icon: DoorOpen, trend: t('stats.avgCapacity', { count: capaciteMoyenne }), trendUp: false },
    { label: t('stats.staff'), value: totalPersonnel.toLocaleString(intlLocale), suffix: undefined, Icon: UserCheck, trend: totalPersonnel === 0 ? t('stats.noStaff') : t('stats.activeMembers'), trendUp: false },
    { label: t('stats.collectedThisMonth'), value: Number(totalMois).toLocaleString(intlLocale), suffix: tCommon('currency'), Icon: Banknote, trend: trendCollecte, trendUp: trendCollecteUp },
  ]

  const modules = [
    { label: t('modules.students.label'), desc: t('modules.students.desc'), href: `/${slug}/eleves` },
    { label: t('modules.payments.label'), desc: t('modules.payments.desc'), href: `/${slug}/paiements` },
    { label: t('modules.classes.label'), desc: t('modules.classes.desc'), href: `/${slug}/classes` },
    { label: t('modules.grades.label'), desc: t('modules.grades.desc'), href: `/${slug}/notes/saisie` },
    { label: t('modules.reportCards.label'), desc: t('modules.reportCards.desc'), href: `/${slug}/notes/bulletins` },
    { label: t('modules.attendance.label'), desc: t('modules.attendance.desc'), href: `/${slug}/presences` },
    { label: t('modules.staff.label'), desc: t('modules.staff.desc'), href: `/${slug}/personnel` },
    { label: t('modules.announcements.label'), desc: t('modules.announcements.desc'), href: `/${slug}/annonces` },
  ]

  const modeBadge: Record<string, string> = {
    especes:      'bg-emerald-100 text-emerald-700',
    orange_money: 'bg-orange-100  text-orange-700',
    mtn_momo:     'bg-yellow-100  text-yellow-700',
    virement:     'bg-blue-100    text-blue-700',
  }
  const modeLabel: Record<string, string> = {
    especes: t('payments.methods.especes'),
    orange_money: t('payments.methods.orange_money'),
    mtn_momo: t('payments.methods.mtn_momo'),
    virement: t('payments.methods.virement'),
  }

  const dateStr = new Date().toLocaleDateString(intlLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })


  return (
    <PageShell
      title={t('greeting', { name: prenom ?? nom })}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          {ecole?.nom} — {dateStr}
        </span>
      }
      breadcrumb={t('breadcrumb')}
      actions={
        <Link
          href={`/${slug}/eleves/nouveau`}
          className="btn-primary flex items-center gap-2 py-2.5"
        >
          <UserPlus size={17} />
          {t('enrollStudent')}
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

          {/* encaissements — graphique interactif avec filtres */}
          <EncaissementsChart slug={slug} />

          {/* taux de paiement par classe */}
          <ClassesPaiementChart data={classesPaiement} slug={slug} />
        </div>

        {/* modules + alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('sections.modules')}</h2>
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
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('sections.alerts')}</h2>
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
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('sections.recentPayments')}</h2>
              <Link href={`/${slug}/paiements`} className="text-xs text-emerald-600 hover:underline font-medium">{tCommon('seeAll')}</Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {derniersPaiements.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">{t('payments.empty')}</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">{t('payments.student')}</th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">{t('payments.class')}</th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">{t('payments.method')}</th>
                      <th className="text-right text-xs font-semibold text-slate-400 px-5 py-3">{t('payments.amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {derniersPaiements.map((p: { eleve_id: string; eleve_nom: string; eleve_prenom: string; numero_matricule?: string; classe_nom?: string; mode_paiement: string; montant: number }, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-700">
                          <Link href={studentLinks(slug, {
                            id: p.eleve_id,
                            nom: p.eleve_nom,
                            prenom: p.eleve_prenom,
                            numero_matricule: p.numero_matricule || '',
                          }).fiche} className="hover:text-emerald-700">
                            {p.eleve_prenom} {p.eleve_nom}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{p.classe_nom ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${modeBadge[p.mode_paiement] ?? 'bg-slate-100 text-slate-500'}`}>
                            {modeLabel[p.mode_paiement] ?? p.mode_paiement}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold text-slate-800 text-right">
                          {Number(p.montant).toLocaleString(intlLocale)} <span className="font-normal text-slate-400 text-xs">{tCommon('currency')}</span>
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
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t('sections.quickAccess')}</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: t('quickAccess.newPayment.label'), desc: t('quickAccess.newPayment.desc'), href: `/${slug}/paiements/nouveau`, Icon: CreditCard, color: 'text-amber-600  bg-amber-100' },
                { label: t('quickAccess.enterGrades.label'), desc: t('quickAccess.enterGrades.desc'), href: `/${slug}/notes/saisie`, Icon: BookOpen, color: 'text-violet-600 bg-violet-100' },
                { label: t('quickAccess.attendance.label'), desc: t('quickAccess.attendance.desc'), href: `/${slug}/presences`, Icon: CheckSquare, color: 'text-teal-600   bg-teal-100' },
                { label: t('quickAccess.settings.label'), desc: t('quickAccess.settings.desc'), href: `/${slug}/parametres`, Icon: Calendar, color: 'text-blue-600   bg-blue-100' },
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