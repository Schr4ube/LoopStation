const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('loopstationMeta', {
  runtime: 'electron',
  version: process.versions.electron,
});

contextBridge.exposeInMainWorld('loopstationFiles', {
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload),
  loadProject: () => ipcRenderer.invoke('project:load'),
});
