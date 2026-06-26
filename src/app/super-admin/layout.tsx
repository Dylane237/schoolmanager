import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { LogOut } from 'lucide-react'
import LogoutButton from '@/components/logout-button'
import SuperAdminNav from '@/components/layout/SuperAdminNav'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value
  if (!token) redirect('/login')

  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'super_admin') redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-base font-bold">
            S
          </div>
          <div>
            <span className="font-bold text-base">SchoolManager</span>
            <span className="text-slate-400 text-sm ml-2">Administration éditeur</span>
          </div>
        </div>
        <div className="flex items-center">
          <SuperAdminNav />
          <LogoutButton className="ml-4 px-4 py-2 rounded-lg text-base text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </LogoutButton>
        </div>
      </header>
      <main className="p-8">{children}</main>
    </div>
  )
}
