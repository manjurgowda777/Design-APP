const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Native save file dialog
  saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),

  // Native open file dialog
  openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),

  // Retrieve user data & local document paths
  getLocalPaths: () => ipcRenderer.invoke('app:get-local-paths'),
});
