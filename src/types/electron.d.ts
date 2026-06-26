interface ElectronAPI {
  platform: string
  getDataPath: () => Promise<string>
  openDataFolder: () => Promise<void>
}

interface Window {
  electronAPI?: ElectronAPI
}
