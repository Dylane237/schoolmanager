interface UpdateStatusPayload {
  status: string
  version?: string
  progress?: number
  error?: string
}

interface ElectronAPI {
  platform: string
  getDataPath: () => Promise<string>
  openDataFolder: () => Promise<void>
  restoreDatabase: () => Promise<{
    success: boolean
    canceled?: boolean
    error?: string
    safetyBackupPath?: string
  }>
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<{ success?: boolean; version?: string; error?: string }>
  downloadUpdate: () => Promise<{ success?: boolean; error?: string }>
  installUpdate: () => Promise<void>
  onUpdateStatus?: (callback: (payload: UpdateStatusPayload) => void) => () => void
}

interface Window {
  electronAPI?: ElectronAPI
}
