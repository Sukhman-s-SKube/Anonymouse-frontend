const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    createDB: () => ipcRenderer.invoke("createDB"),
    createDHTable: () => ipcRenderer.invoke("createDHTable"),
    insertDHKeys: (keys) => ipcRenderer.invoke("insertDHKeys", keys),
    getDHKey: (id) => ipcRenderer.invoke("getDHKey", id),
    delDHKey: (id) => ipcRenderer.invoke("delDHKey", id),
    delAllDHKeys: () => ipcRenderer.invoke("delAllDHKeys"),
    alert: (msg) => ipcRenderer.send("alert", msg)
});
