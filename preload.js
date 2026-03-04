const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('loopstationMeta', {
  runtime: 'electron',
  version: process.versions.electron,
});
