import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { getDb, getActiveAnneeScolaire } from '@/lib/db-server'
import { prepareSchoolDb, resolveActiveLicence } from '@/lib/school-db'
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

  const licence = payload.role !== 'super_admin'
    ? await resolveActiveLicence(db, slug, ecole.id)
    : { type: 'premium', date_fin: '2099-12-31' }

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
