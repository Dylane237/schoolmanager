import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { getDb, getActiveAnneeScolaire } from '@/lib/db-server'
import { prepareSchoolDb } from '@/lib/school-db'
import { SchoolProvider } from '@/components/layout/SchoolProvider'
import AppShell from '@/components/layout/AppShell'

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const reserved = ['super-admin', 'api', 'login', 'register', 'licence-expiree']
  if (reserved.includes(slug)) {
    return <>{children}</>
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyToken(token)
  if (!payload) redirect('/login')

  if (payload.role !== 'super_admin') {
    if (!payload.ecole_slug || payload.ecole_slug !== slug) {
      redirect(payload.ecole_slug ? `/${payload.ecole_slug}/dashboard` : '/login')
    }
  }

  if (process.env.VERCEL && payload.ecole_slug) {
    await prepareSchoolDb(payload.ecole_slug)
  }

  const db = getDb(slug)
  const ecole = db.prepare('SELECT id, nom, logo_url FROM ecoles WHERE slug = ?').get(slug) as {
    id: string; nom: string; logo_url: string | null
  } | undefined

  if (!ecole) redirect('/login')

  const licenceRow = db.prepare(`
    SELECT type, date_fin FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    ORDER BY date_fin DESC
    LIMIT 1
  `).get(ecole.id) as { type: string; date_fin: string } | undefined

  let licence: { type: string; date_fin: string } | undefined = licenceRow
    ? { type: licenceRow.type, date_fin: licenceRow.date_fin }
    : undefined

  if (!licence && payload.role !== 'super_admin') {
    try {
      const licenceDb = db.prepare(`
        SELECT cle_licence FROM licences WHERE ecole_id = ?
      `).get(ecole.id) as { cle_licence: string } | undefined

      if (licenceDb?.cle_licence) {
        const res = await fetch(
          `https://schoolmanager-eosin.vercel.app/api/auth/verify-licence?cle=${encodeURIComponent(licenceDb.cle_licence)}`,
          {
            headers: { 'User-Agent': 'SchoolManager-Desktop/1.0' },
            signal: AbortSignal.timeout(5000),
          },
        )
        const data = await res.json()
        if (data.valid) {
          licence = { type: data.plan, date_fin: data.date_fin }
          db.prepare(`
            INSERT INTO licence_cache (cle, plan, date_fin, last_verified, is_active)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(cle) DO UPDATE SET
              plan = excluded.plan,
              date_fin = excluded.date_fin,
              last_verified = excluded.last_verified,
              is_active = 1
          `).run(licenceDb.cle_licence, data.plan, data.date_fin, new Date().toISOString())
        }
      }
    } catch (e) {
      console.warn('[layout] vérification licence en ligne échouée:', e)
    }
  }

  if (!licence && payload.role !== 'super_admin') {
    redirect('/licence-expiree')
  }

  const anneeScolaire = getActiveAnneeScolaire(db, ecole.id)
  const nom = (payload.nom as string) || 'Admin'
  const prenom = payload.prenom as string | undefined
  const initials = ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase() || 'AD'

  return (
    <SchoolProvider value={{
      slug,
      ecoleNom: ecole.nom,
      anneeScolaire,
      licenceType: licence?.type ?? null,
      licenceFin: licence?.date_fin ?? null,
      logoUrl: ecole.logo_url || null,
      userInitials: initials,
      userNom: prenom ? `${prenom} ${nom}` : nom,
      userRole: payload.role,
    }}>
      <AppShell>{children}</AppShell>
    </SchoolProvider>
  )
}
