import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SchoolManager — Administration éditeur',
  description: 'Gestion des licences et parrainages SchoolManager',
}

export default function AdminLicencesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-editor min-h-screen bg-slate-950 text-slate-100 antialiased">
      {children}
    </div>
  )
}
