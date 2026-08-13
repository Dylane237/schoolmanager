'use client'

import { useEffect } from 'react'
import { useTopBarOptional } from './TopBarContext'

interface PageShellProps {
  title: string
  subtitle?: React.ReactNode
  breadcrumb?: string
  actions?: React.ReactNode
  children: React.ReactNode
  fullWidth?: boolean
}

export default function PageShell({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
  fullWidth = false,
}: PageShellProps) {
  const topBar = useTopBarOptional()
  const crumb = breadcrumb || title

  useEffect(() => {
    if (!topBar) return
    topBar.setBreadcrumb(crumb)
    return () => topBar.setBreadcrumb(null)
  }, [topBar, crumb])

  return (
    <div className="min-h-full bg-slate-50 flex flex-col">
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
