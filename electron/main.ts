import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    frame: false,
    backgroundColor: '#0b0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: false,
  });

  // Smooth appearance when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] [lvl ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer Fail Load] ${errorCode} - ${errorDescription} at ${validatedURL}`);
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Window control IPCs
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });

  // Windows Desktop Notifications
  ipcMain.on('show-notification', (_, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({
        title: title || 'Kizuna AI',
        body: body || '',
      }).show();
    }
  });

  // Open external browser links safely
  ipcMain.on('open-external', (_, url) => {
    shell.openExternal(url);
  });

  // Local SQLite persistence in userData directory
  const dbPath = path.join(app.getPath('userData'), 'kizuna_data.sqlite');

  ipcMain.handle('db-save', async (_, data: Uint8Array) => {
    try {
      fs.writeFileSync(dbPath, Buffer.from(data));
      return true;
    } catch (err) {
      console.error('Failed to write database to disk:', err);
      return false;
    }
  });

  ipcMain.handle('db-load', async () => {
    try {
      if (fs.existsSync(dbPath)) {
        const buf = fs.readFileSync(dbPath);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      }
      return null;
    } catch (err) {
      console.error('Failed to read database from disk:', err);
      return null;
    }
  });

  ipcMain.handle('get-wasm-binary', async () => {
    const possiblePaths = [
      path.join(__dirname, '../dist/sql-wasm.wasm'),
      path.join(__dirname, '../public/sql-wasm.wasm'),
      path.join(__dirname, 'sql-wasm.wasm'),
      path.join(app.getAppPath(), 'dist/sql-wasm.wasm'),
      path.join(app.getAppPath(), 'public/sql-wasm.wasm'),
      path.join(process.resourcesPath, 'sql-wasm.wasm'),
      path.join(process.resourcesPath, 'app.asar/dist/sql-wasm.wasm'),
    ];
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
      } catch (err) {
        console.warn('Error reading wasm candidate path:', p, err);
      }
    }
    console.warn('Could not locate sql-wasm.wasm in candidate paths');
    return null;
  });
}

app.whenReady().then(() => {
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
