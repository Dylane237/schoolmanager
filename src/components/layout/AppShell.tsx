'use client'

import { useSchool } from './SchoolProvider'
import Sidebar from './Sidebar'
import SchoolWatermark from './SchoolWatermark'
import ModuleGuard from './ModuleGuard'
import AppTopBar from './AppTopBar'
import { TopBarProvider } from './TopBarContext'
import { LicenceStatusProvider } from '@/hooks/useLicenceStatus'
import { SyncStatusProvider } from '@/hooks/useSyncStatus'

type AppShellProps = {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { slug, ecoleNom } = useSchool()

  return (
    <LicenceStatusProvider>
      <SyncStatusProvider>
        <TopBarProvider>
          <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar slug={slug} ecoleNom={ecoleNom} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <AppTopBar />
              <main className="flex-1 overflow-y-auto relative">
                <SchoolWatermark />
                <div className="relative z-[1] min-h-full">
                  <ModuleGuard>{children}</ModuleGuard>
                </div>
              </main>
            </div>
          </div>
        </TopBarProvider>
      </SyncStatusProvider>
    </LicenceStatusProvider>
  )
}
