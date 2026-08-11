'use client'

import { useSchool } from './SchoolProvider'
import SchoolLogoMark from './SchoolLogoMark'

interface PageShellProps {
  title: string
  subtitle?: React.ReactNode
  breadcrumb?: string
  actions?: React.ReactNode
  children: React.ReactNode
  fullWidth?: boolean
}

const LICENCE_STYLES: Record<string, string> = {
  starter: 'bg-slate-700 text-slate-200',
  standard: 'bg-blue-900 text-blue-200',
  premium: 'bg-emerald-600 text-white',
}

export default function PageShell({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
  fullWidth = false,
}: PageShellProps) {
  const { slug, anneeScolaire, licenceType, userInitials } = useSchool()

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 lg:px-8 h-[60px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <SchoolLogoMark size="lg" className="hidden sm:flex shrink-0" />
          <p className="text-sm text-slate-400 truncate">
          <span className="text-slate-500 capitalize">{slug}</span>
          {' / '}
          <span className="text-slate-800 font-medium">{breadcrumb || title}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden sm:inline text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5">
            {anneeScolaire}
          </span>
          {licenceType && (
            <span className={`hidden md:inline text-xs font-semibold rounded-lg px-3 py-1.5 capitalize ${LICENCE_STYLES[licenceType] ?? 'bg-slate-700 text-slate-200'}`}>
              {licenceType}
            </span>
          )}
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
            {userInitials}
          </div>
        </div>
      </header>

      <div className={`flex-1 p-6 lg:p-8 ${fullWidth ? '' : 'max-w-screen-2xl mx-auto w-full'}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle && (
              <div className="page-subtitle">{typeof subtitle === 'string' ? subtitle : subtitle}</div>
            )}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}
