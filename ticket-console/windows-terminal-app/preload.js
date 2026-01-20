const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  verifyCode: (code) => ipcRenderer.invoke('verify-code', code),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', (event, status) => callback(status));
  }
});
