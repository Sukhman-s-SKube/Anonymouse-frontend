import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import path from 'path'; 
import isDev from 'electron-is-dev';
import database from 'better-sqlite3-multiple-ciphers';
import Badge from 'electron-windows-badge';
import { createHash } from 'crypto';
import fs from "fs";

let win;

const dbPath = (userId) => {
    return path.join(isDev ? app.getAppPath() : app.getPath("userData"), userId + ".db");
};

const newDBQueries = (db) => {
    let query = `
        CREATE TABLE DHKey (
            id INTEGER PRIMARY KEY,
            public STRING NOT NULL,
            private STRING NOT NULL
            )`
    ;
    db.exec(query);
    query = `
        CREATE TABLE Person (
            mongoId STRING PRIMARY KEY,
            identity_priv_key STRING NOT NULL,
            identity_pub_key STRING NOT NULL,
            schnorr_priv_key STRING NOT NULL,
            schnorr_pub_key STRING NOT NULL,
            schnorr_sig STRING NOT NULL,
            display_name STRING NOT NULL
            )`
    ;
    db.exec(query);

    query = `
        CREATE TABLE Chatroom (
            mongoId STRING PRIMARY KEY,
            name STRING NOT NULL,
            root_key STRING NOT NULL,
            send_chain_key STRING,
            receive_chain_key STRING,
            self_priv_dh STRING,
            self_pub_dh STRING,
            other_pub_dh STRING
            )`
    ;
    db.exec(query);

    query = `
        CREATE TABLE Message (
            mongoId STRING PRIMARY KEY,
            content STRING NOT NULL,
            sender STRING NOT NULL,
            chatroom_id STRING NOT NULL,
            timestamp STRING NOT NULL,
            FOREIGN KEY(chatroom_id) REFERENCES Chatroom(mongoId)
            )`
    ;
    db.exec(query);
};

app.on('ready', () => {
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(app.getAppPath(), isDev ? '.' : '..', '/electron/preload.cjs'),
            // devTools: isDev
        },
        title: 'AnonyMouse'
    });

    if (isDev) win.loadURL('http://localhost:3000');
    else win.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));

    if (process.platform == 'win32') {
        app.setAppUserModelId(app.name);
        new Badge(win);
    }

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
});
  
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("createDB", async (event, userId) => {
    if (fs.existsSync(dbPath(userId))) {
        fs.unlink(dbPath(userId), (err) => {
            if (err) console.log(err);
        });
    }
    const db = new database(dbPath(userId));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = 1');

    newDBQueries(db);
    db.close();
});

ipcMain.handle("checkDB", async (event, userId) => {
    if (!fs.existsSync(dbPath(userId))) {
        const db = new database(dbPath(userId));
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = 1');
    
        newDBQueries(db);
        db.close();
        return false;
    }
    return true;
});

ipcMain.handle("initPerson", async (event, person, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const insertData = db.prepare("INSERT INTO Person (mongoId, identity_priv_key, identity_pub_key, schnorr_priv_key, schnorr_pub_key, schnorr_sig, display_name) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        person._id,
        person.ik,
        person.IK,
        person.sk,
        person.SK,
        person.sSig,
        person.name
    );
    db.close();
});

ipcMain.handle("getIdentityKey", async (event, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const res = db.prepare("SELECT identity_priv_key FROM Person").get();
    db.close();

    return res.identity_priv_key;
});

ipcMain.handle("getSchnorrKey", async (event, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const res = db.prepare("SELECT schnorr_priv_key FROM Person").get();
    db.close();

    return res.schnorr_priv_key;
});

ipcMain.handle("getChatroom", async (event, chatroomId, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const res = db.prepare("SELECT * FROM Chatroom WHERE mongoId = ?").get(chatroomId);
    db.close();

    return res;
});

ipcMain.handle("insertChatroom", async (event, chatroom, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const insertData = db.prepare("INSERT INTO Chatroom (mongoId, name, root_key) VALUES (?, ?, ?)").run(
        chatroom._id,
        chatroom.name,
        chatroom.rk
    );
    db.close();
});


ipcMain.handle("updateChatroom", async (event, fields, chatroomId, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);
    let query = "UPDATE Chatroom SET ";
    let params = [];
    if (fields.rk) {
        query += `root_key = ?, `;
        params.push(fields.rk);
    }
    if (fields.sck) {
        query += `send_chain_key = ?, `;
        params.push(fields.sck);
    }
    if (fields.rck) {
        query += `receive_chain_key = ?, `;
        params.push(fields.rck);
    }
    if (fields.privDH) {
        query += `self_priv_dh = ?, `;
        params.push(fields.privDH);
    }
    if (fields.selfPubDH) {
        query += `self_pub_dh = ?, `;
        params.push(fields.selfPubDH);
    }
    if (fields.otherPubDH) {
        if (fields.otherPubDH == ".") {
            query += `other_pub_dh = NULL, `;
        }
        else {
            query += `other_pub_dh = ?, `;
            params.push(fields.otherPubDH);
        }
    }

    query = query.substring(0, query.length - 2)
    query += " WHERE mongoId = ?";

    params.push(chatroomId);
    db.prepare(query).run(params);

    db.close();
});

ipcMain.handle("chatroomExists", async (event, chatroomId, userId) => {
    const db = new database(dbPath(userId));
    const chatroom = db.prepare("SELECT * FROM Chatroom WHERE mongoId = ?").get(chatroomId);

    db.close();
    return !(chatroom === undefined); 
});

ipcMain.handle("insertMsg", async (event, msg, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const insertData = db.prepare("INSERT INTO Message (mongoId, content, sender, chatroom_id, timestamp) VALUES (?, ?, ?, ?, ?)").run(msg._id, msg.message.content, msg.sender, msg.chatroom, msg.message.timestamp);
    db.close();
});

ipcMain.handle("getMsgs", async (event, chatroom, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const msgs = db.prepare("SELECT * FROM Message WHERE chatroom_id = ? ORDER BY timestamp asc").all(chatroom);
    db.close();
    
    return msgs;
});

ipcMain.handle("getMsg", async (event, msgId, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const msg = db.prepare("SELECT * FROM Message WHERE mongoId = ?").get(msgId);
    db.close();
    
    return msg;
});

ipcMain.handle("insertDHKeys", async (event, keys, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    for (let key of keys) {
        const insertData = db.prepare("INSERT INTO DHKey (private, public) VALUES (?, ?)").run(key.privKey, key.pubKey);
    }
    db.close();
});

ipcMain.handle("getKeys", async (event, numKeys, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const keys = db.prepare("SELECT id, public FROM DHKey ORDER BY id DESC LIMIT ?").all(numKeys);
    db.close();
    
    return keys;
});

ipcMain.handle("getDHKey", async (event, keyId, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const row = db.prepare("SELECT * FROM DHKey WHERE id = ?").get(keyId);
    db.close();

    return row
});

ipcMain.handle("delDHKey", async (event, keyId, userId) => {
    const db = new database(dbPath(userId));
    // db.pragma(`key='${args[0]}'`);

    const delData = db.prepare("DELETE FROM DHKey WHERE id = ?").run(keyId);
    db.close();
});

ipcMain.handle("sysNoti", (event, title, body) => {
    if (!win.isFocused()) {
        new Notification({title: title, body: body}).show()
    }
});

ipcMain.handle("sha256", async (event, str) => {
    let hash = createHash('sha256').update(str).digest('base64')
    return hash;
})