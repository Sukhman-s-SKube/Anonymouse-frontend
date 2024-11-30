import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path'; 
import isDev from 'electron-is-dev';
import database from 'better-sqlite3-multiple-ciphers';

let mainWin

app.on('ready', () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(app.getAppPath(), isDev ? '.' : '..', '/electron/preload.cjs')
        }
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
    if (BrowserWindow.getAllWindows().length === 0) mainWin = createWindow();
});

ipcMain.handle("createDB", async (event, args) => {
    const db = new database(path.join(isDev ? app.getAppPath() : app.getPath("userData"), 'app.db'));
    db.pragma('journal_mode = WAL');
    // db.pragma(`rekey='${args[0]}'`);
    db.close();
});

ipcMain.handle("createDHTable", async (event, args) => {
    const db = new database(path.join(isDev ? app.getAppPath() : app.getPath("userData"), 'app.db'));
    // db.pragma(`key='${args[0]}'`);

    const query = `
        CREATE TABLE dh_keys (
            id INTEGER PRIMARY KEY,
            privKey STRING NOT NULL,
            pubKey STRING NOT NULL
            )`
    ;
    db.exec(query);
    db.close();

});

ipcMain.handle("insertDHKeys", async (event, args) => {
    const db = new database(path.join(isDev ? app.getAppPath() : app.getPath("userData"), 'app.db'));
    // db.pragma(`key='${args[0]}'`);
    const keys = args;

    for (let key of keys) {
        const insertData = db.prepare("INSERT INTO dh_keys (id, privKey, pubKey) VALUES (?, ?, ?)").run(key.id, key.privKey, key.pubKey);
    }
    db.close();
});

ipcMain.handle("getDHKey", async (event, args) => {
    const db = new database(path.join(isDev ? app.getAppPath() : app.getPath("userData"), 'app.db'));
    // db.pragma(`key='${args[0]}'`);
    const row = db.prepare("SELECT * FROM dh_keys WHERE id = ?").get(args);
    db.close();
    return row
});

ipcMain.handle("delDHKey", async (event, args) => {
    const db = new database(path.join(isDev ? app.getAppPath() : app.getPath("userData"), 'app.db'));
    // db.pragma(`key='${args[0]}'`);
    const delData = db.prepare("DELETE FROM dh_keys WHERE id = ?").run(args);
    db.close();
});

ipcMain.handle("delAllDHKeys", async (event, args) => {
    const db = new database(path.join(isDev ? app.getAppPath() : app.getPath("userData"), 'app.db'));
    // db.pragma(`key='${args[0]}'`);
    const delData = db.prepare("DELETE FROM dh_keys").run();
    db.close();
});

ipcMain.on("alert", (event, args) => {
    const options = {
        type: "none",
        buttons: ["Okay"],
        title: "Alert Message!",
        message: args,
    }
    dialog.showMessageBox(mainWin, options)
});