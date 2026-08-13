'use client'

import { useEffect, useState } from 'react'
import { useSchool } from './SchoolProvider'
import { useTopBarOptional } from './TopBarContext'
import { useLicenceStatus } from '@/hooks/useLicenceStatus'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'
import { hasModuleAccess } from '@/lib/rbac'
import { isElectronClient } from '@/lib/desktop-download'
import SchoolLogoMark from './SchoolLogoMark'
import SyncStatusTopBar from './SyncStatusTopBar'
import LicenceTopBarButton from './LicenceTopBarButton'
import SyncNotificationBell from './SyncNotificationBell'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

export default function AppTopBar() {
  const { slug, anneeScolaire, userInitials, userRole } = useSchool()
  const topBar = useTopBarOptional()
  const sync = useSyncStatusOptional()
  const { status } = useLicenceStatus()
  const showSyncAndLicence = hasModuleAccess(userRole, 'parametres')
  const [isDesktopClient, setIsDesktopClient] = useState(
    () => typeof window !== 'undefined' && isElectronClient(),
  )

  useEffect(() => {
    setIsDesktopClient(isElectronClient())
  }, [])

  const breadcrumbLabel = topBar?.breadcrumb
  const otherPlatformUsed = isDesktopClient
    ? sync?.webEverUsed === true
    : sync?.desktopEverUsed === true
  const showNotificationBell = showSyncAndLicence && otherPlatformUsed

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0">
      <div className="h-14 px-4 lg:px-6 flex items-center gap-3">
        {/* Espace menu mobile */}
        <div className="w-10 shrink-0 lg:hidden" aria-hidden />

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <SchoolLogoMark size="md" className="hidden sm:flex shrink-0" />
          <p className="text-sm text-slate-400 truncate">
            <span className="text-slate-500 capitalize">{slug}</span>
            {breadcrumbLabel && (
              <>
                {' / '}
                <span className="text-slate-800 font-medium">{breadcrumbLabel}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5">
            {anneeScolaire}
          </span>

          {showSyncAndLicence && <SyncStatusTopBar slug={slug} />}
          {showSyncAndLicence && <LicenceTopBarButton />}
          <LanguageSwitcher variant="auth" />
          {showNotificationBell && <SyncNotificationBell slug={slug} />}

          <div
            className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm ring-2 ring-white"
            title={status?.planLabel ?? undefined}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  )
}
