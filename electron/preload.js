const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("churchai", {
  getSettings: () => ipcRenderer.invoke("settings:getAll"),
  setSetting: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  getStatus: () => ipcRenderer.invoke("status:get"),
  checkIntegrity: () => ipcRenderer.invoke("data:integrity"),
  backupNow: () => ipcRenderer.invoke("data:backup"),
  exportData: () => ipcRenderer.invoke("data:export"),
  bibleBooks: () => ipcRenderer.invoke("bible:books"),
  parseReference: (text) => ipcRenderer.invoke("bible:parse", text),
  translations: () => ipcRenderer.invoke("bible:translations"),
  chapter: (tid, book, chapter) => ipcRenderer.invoke("bible:chapter", tid, book, chapter),
  searchBible: (tid, query) => ipcRenderer.invoke("bible:search", tid, query),
  removeTranslation: (tid) => ipcRenderer.invoke("bible:remove", tid),
  importBible: (meta) => ipcRenderer.invoke("bible:import", meta),
  getLive: () => ipcRenderer.invoke("live:get"),
  showLive: (content) => ipcRenderer.invoke("live:show", content),
  setBlank: (blanked) => ipcRenderer.invoke("live:blank", blanked),
  openAudience: () => ipcRenderer.invoke("live:openAudience"),
  closeAudience: () => ipcRenderer.invoke("live:closeAudience"),
  onLiveState: (cb) => {
    const handler = (_e, state) => cb(state);
    ipcRenderer.on("live:state", handler);
    return () => ipcRenderer.removeListener("live:state", handler);
  },
});
