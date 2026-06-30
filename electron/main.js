const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  // Start the backend as a child process using the installed node
  const backendPath = path.join(__dirname, '..', 'backend', 'index.js');
  if (!fs.existsSync(backendPath)) {
    console.error('Backend entry not found:', backendPath);
    return null;
  }

  const proc = spawn(process.execPath, [backendPath], {
    env: Object.assign({}, process.env, { NODE_ENV: 'production' }),
    stdio: 'inherit'
  });

  proc.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  return proc;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Prefer a packaged frontend build; fall back to dev server
  const prodIndex = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  const devUrl = `http://localhost:${process.env.FRONTEND_PORT || 5000}`;

  if (fs.existsSync(prodIndex)) {
    mainWindow.loadFile(prodIndex);
  } else {
    mainWindow.loadURL(devUrl).catch(err => console.error('Failed to load dev url', err));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Start backend first
  backendProcess = startBackend();

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On Windows, quit the app when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {
      console.warn('Failed to kill backend process', e);
    }
  }
});
