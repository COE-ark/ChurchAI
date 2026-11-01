const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("audience", {
  onUpdate: (cb) => ipcRenderer.on("live:update", (_e, state) => cb(state)),
});
