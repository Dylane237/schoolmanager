const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
})