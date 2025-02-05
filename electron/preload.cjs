const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    createDB: () => ipcRenderer.invoke("createDB"),
    // createDHTable: () => ipcRenderer.invoke("createDHTable"),
    // createMsgsTable: () => ipcRenderer.invoke("createMsgsTable"),
    insertMsg: (msg) => ipcRenderer.invoke("insertMsg", msg),
    getMsgs: (chatroom) => ipcRenderer.invoke("getMsgs", chatroom),
    getMsg: (id) => ipcRenderer.invoke("getMsg", id),
    insertDHKeys: (keys) => ipcRenderer.invoke("insertDHKeys", keys),
    getDHKey: (id) => ipcRenderer.invoke("getDHKey", id),
    delDHKey: (id) => ipcRenderer.invoke("delDHKey", id),
    delAllDHKeys: () => ipcRenderer.invoke("delAllDHKeys"),
    // alert: (msg) => ipcRenderer.send("alert", msg),
    sha256: (str) => ipcRenderer.invoke("sha256", str),
    getKeys: (numKeys) => ipcRenderer.invoke("getKeys", numKeys),
});
