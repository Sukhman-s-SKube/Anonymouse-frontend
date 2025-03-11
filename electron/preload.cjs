const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    createDB: (userId) => ipcRenderer.invoke("createDB", userId),
    checkDB: (userId) => ipcRenderer.invoke("checkDB", userId),
    initPerson: (person, userId) => ipcRenderer.invoke("initPerson", person, userId),
    insertMsg: (msg, userId) => ipcRenderer.invoke("insertMsg", msg, userId),
    getMsgs: (chatroom, userId) => ipcRenderer.invoke("getMsgs", chatroom, userId),
    getMsg: (msgId, userId) => ipcRenderer.invoke("getMsg", msgId, userId),
    insertDHKeys: (keys, userId) => ipcRenderer.invoke("insertDHKeys", keys, userId),
    getKeys: (numKeys, userId) => ipcRenderer.invoke("getKeys", numKeys, userId),
    getDHKey: (keyId, userId) => ipcRenderer.invoke("getDHKey", keyId, userId),
    delDHKey: (keyId, userId) => ipcRenderer.invoke("delDHKey", keyId, userId),
    sha256: (str) => ipcRenderer.invoke("sha256", str),
});
