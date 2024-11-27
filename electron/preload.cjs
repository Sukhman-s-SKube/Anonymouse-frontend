const electron = require('electron');

electron.contextBridge.exposeInMainWorld('electron', {
    getTest: () => console.log("testing brudge"),
});

