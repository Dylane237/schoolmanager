import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { getDb, getActiveAnneeScolaire } from '@/lib/db-server'
import Sidebar from '@/components/layout/Sidebar'
import { SchoolProvider } from '@/components/layout/SchoolProvider'

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

  const db = getDb()
  const ecole = db.prepare('SELECT * FROM ecoles WHERE slug = ?').get(slug) as {
    id: string; nom: string
  } | undefined

  if (!ecole) redirect('/login')

  const licence = db.prepare(`
    SELECT type, date_fin FROM licences
    WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    ORDER BY date_fin DESC LIMIT 1
  `).get(ecole.id) as { type: string; date_fin: string } | undefined

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
      userInitials: initials,
      userNom: prenom ? `${prenom} ${nom}` : nom,
      userRole: payload.role,
    }}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar slug={slug} ecoleNom={ecole.nom} licenceFin={licence?.date_fin} />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </SchoolProvider>
  )
}
