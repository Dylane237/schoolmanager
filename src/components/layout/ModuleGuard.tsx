'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { useSchool } from './SchoolProvider'
import { getModuleForPagePath, hasModuleAccess } from '@/lib/rbac'

type ModuleGuardProps = {
  children: React.ReactNode
}

export default function ModuleGuard({ children }: ModuleGuardProps) {
  const pathname = usePathname()
  const { slug, userRole } = useSchool()
  const t = useTranslations('components.moduleGuard')

  const appModule = getModuleForPagePath(pathname, slug)
  if (appModule && !hasModuleAccess(userRole, appModule)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('title')}</h2>
          <p className="text-slate-500 text-sm mb-6">
            {t('description', { role: userRole.replace('_', ' ') })}
          </p>
          <Link
            href={`/${slug}/dashboard`}
            className="inline-flex items-center gap-2 btn-primary py-2.5 px-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> {t('backToDashboard')}
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
