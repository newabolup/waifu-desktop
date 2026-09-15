import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  saveDatabase: (data: Uint8Array) => ipcRenderer.invoke('db-save', data),
  loadDatabase: () => ipcRenderer.invoke('db-load'),
  loadWasmBinary: () => ipcRenderer.invoke('get-wasm-binary'),

  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  openExternal: (url: string) => ipcRenderer.send('open-external', url),
});
