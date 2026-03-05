const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#090b14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

async function writeProject(payload) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save LoopStation project',
    defaultPath: 'loopstation-project.json',
    filters: [{ name: 'LoopStation Project', extensions: ['json'] }],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  const projectDir = path.dirname(filePath);
  const audioDir = path.join(projectDir, 'audio');
  await fs.mkdir(audioDir, { recursive: true });

  for (const file of payload.audioFiles || []) {
    const wavPath = path.join(audioDir, file.filename);
    await fs.writeFile(wavPath, Buffer.from(file.base64, 'base64'));
  }

  const projectData = {
    version: 1,
    bpm: payload.bpm,
    masterVolume: payload.masterVolume,
    tracks: payload.tracks,
    audioDirectory: 'audio',
    savedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, JSON.stringify(projectData, null, 2), 'utf-8');

  return { canceled: false, filePath, writtenFiles: payload.audioFiles?.length ?? 0 };
}

async function readProject() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Load LoopStation project',
    properties: ['openFile'],
    filters: [{ name: 'LoopStation Project', extensions: ['json'] }],
  });

  if (canceled || !filePaths?.length) {
    return { canceled: true };
  }

  const projectPath = filePaths[0];
  const raw = await fs.readFile(projectPath, 'utf-8');
  const project = JSON.parse(raw);
  const projectDir = path.dirname(projectPath);
  const audioDir = path.join(projectDir, project.audioDirectory || 'audio');

  const audioFiles = [];

  for (const track of project.tracks || []) {
    if (!track.audioFile) continue;
    const wavPath = path.join(audioDir, track.audioFile);
    const wavBuffer = await fs.readFile(wavPath);
    audioFiles.push({
      trackId: track.id,
      filename: track.audioFile,
      base64: wavBuffer.toString('base64'),
    });
  }

  return {
    canceled: false,
    filePath: projectPath,
    project,
    audioFiles,
  };
}

app.whenReady().then(() => {
  ipcMain.handle('project:save', (_, payload) => writeProject(payload));
  ipcMain.handle('project:load', () => readProject());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
