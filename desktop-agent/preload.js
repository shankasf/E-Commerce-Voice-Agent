const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terminal', {
    onLog: (callback) => ipcRenderer.on('terminal:log', callback),
    onData: (callback) => ipcRenderer.on('terminal:data', callback),
    onStatus: (callback) => ipcRenderer.on('terminal:status', callback),
    sendInput: (cmd) => ipcRenderer.send('terminal:input', cmd)
});

contextBridge.exposeInMainWorld('auth', {
    login: (email, password) => ipcRenderer.invoke('login-attempt', { email, password })
});

contextBridge.exposeInMainWorld('sys', {
    getSpecs: () => ipcRenderer.invoke('get-system-specs')
});
