import { app, BrowserWindow } from 'electron';
import path from 'path'; 
import isDev from 'electron-is-dev';

app.on('ready', () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {}
    });

    if (isDev) win.loadURL('http://localhost:3000');
    else win.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
});
  
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});