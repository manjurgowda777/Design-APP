const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0f172a',
    title: 'Architecture Studio - Offline Desktop Edition',
    icon: path.join(__dirname, '../public/vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Gracefully show window when ready to prevent flicker
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Determine whether running in dev mode or packaged offline production
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(() => {
      // Fallback to local dist file if dev server is unreachable
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    // 100% offline standalone file loading
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links safely in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native IPC Dialog Handlers for 100% Local Disk Storage

// 1. Native Save File Dialog (JSON, PNG, SVG, Markdown ADR)
ipcMain.handle('dialog:save-file', async (event, { defaultName, content, filters, isBinary }) => {
  if (!mainWindow) return { success: false };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Architecture File to Local Storage',
    defaultPath: defaultName || 'architecture-diagram.json',
    filters: filters || [
      { name: 'Architecture Diagram (JSON)', extensions: ['json'] },
      { name: 'Vector Graphic (SVG)', extensions: ['svg'] },
      { name: 'Architecture Decision Record (Markdown)', extensions: ['md'] },
      { name: 'High-Res Image (PNG)', extensions: ['png'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || !filePath) {
    return { success: false, canceled: true };
  }

  try {
    if (isBinary && typeof content === 'string' && content.startsWith('data:')) {
      // Base64 data URL decoded to binary buffer (for PNG)
      const base64Data = content.split(';base64,').pop();
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } else {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { success: true, filePath };
  } catch (err) {
    console.error('Failed to save file locally:', err);
    return { success: false, error: err.message };
  }
});

// 2. Native Open File Dialog (Load JSON diagram)
ipcMain.handle('dialog:open-file', async (event, { filters }) => {
  if (!mainWindow) return { success: false };

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Architecture Diagram from Local Storage',
    properties: ['openFile'],
    filters: filters || [
      { name: 'Architecture Diagram (JSON)', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const selectedPath = filePaths[0];
    const content = fs.readFileSync(selectedPath, 'utf-8');
    return {
      success: true,
      filePath: selectedPath,
      filename: path.basename(selectedPath),
      content,
    };
  } catch (err) {
    console.error('Failed to open file locally:', err);
    return { success: false, error: err.message };
  }
});

// 3. Query Local App Data directory
ipcMain.handle('app:get-local-paths', () => {
  return {
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    desktop: app.getPath('desktop'),
    appPath: app.getAppPath(),
  };
});

// Application Lifecycle
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
