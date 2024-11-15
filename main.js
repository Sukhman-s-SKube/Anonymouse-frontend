const { app, BrowserWindow } = require('electron');
const path = require('path');
let isDev; // need to import electron dynamically because latest version of electron-is-dev is not compatible with CommonJS Module

(async () => {
  isDev = (await import('electron-is-dev')).default;

  // code that depends on isDev should be inside this async function

  function createWindow() {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    win.loadURL(
      isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, 'build', 'index.html')}`
    );

    if (isDev) {
      win.webContents.openDevTools();
    }
  }

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
})();

