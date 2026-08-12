'use client'

import { useSchool } from './SchoolProvider'
import Sidebar from './Sidebar'
import SchoolWatermark from './SchoolWatermark'
import ModuleGuard from './ModuleGuard'
import AutoDbSync from './AutoDbSync'
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
        <AutoDbSync />
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar slug={slug} ecoleNom={ecoleNom} />
          <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 relative">
            <SchoolWatermark />
            <div className="relative z-[1] min-h-full">
              <ModuleGuard>{children}</ModuleGuard>
            </div>
          </main>
        </div>
      </SyncStatusProvider>
    </LicenceStatusProvider>
  )
}
