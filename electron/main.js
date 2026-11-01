const { app, BrowserWindow, ipcMain, screen, net, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { openStore } = require("./db");
const { BOOKS, parseReference, parseBibleFile } = require("./bible");
const { createLive } = require("./live");

let store;
let win;
let live;

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: "#15171b",
    title: "ChurchAI",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

// Installs the small public-domain sample once, so the Bible library is usable straight away.
function seedSampleBible() {
  if (store.getSetting("sampleBibleSeeded", false)) return;
  const text = fs.readFileSync(path.join(__dirname, "data", "sample-kjv.txt"), "utf8");
  const { verses } = parseBibleFile(text);
  store.installTranslation({ id: "KJV", name: "King James Version (sample excerpt)", language: "en", license: "Public domain" }, verses);
  store.setSetting("sampleBibleSeeded", true);
}

function registerIpc() {
  ipcMain.handle("settings:getAll", () => store.allSettings());
  ipcMain.handle("settings:set", (_e, key, value) => {
    if (typeof key !== "string" || !key) throw new Error("Invalid setting key");
    store.setSetting(key, value);
    return store.allSettings();
  });

  ipcMain.handle("status:get", () => {
    const displays = screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: d.label || `Display ${i + 1}`,
      width: d.size.width,
      height: d.size.height,
      primary: d.id === screen.getPrimaryDisplay().id,
    }));
    return {
      internetOnline: net.isOnline(),
      displays,
      approvedRemotes: store.countApprovedRemotes(),
      dataFolder: path.dirname(store.file),
      schemaVersion: store.schemaVersion(),
      appVersion: app.getVersion(),
    };
  });

  // ---- Bible ----
  ipcMain.handle("bible:books", () => BOOKS);
  ipcMain.handle("bible:parse", (_e, text) => parseReference(text));
  ipcMain.handle("bible:translations", () => store.listTranslations());
  ipcMain.handle("bible:chapter", (_e, tid, book, chapter) => store.getChapter(tid, book, chapter));
  ipcMain.handle("bible:search", (_e, tid, query) => store.searchVerses(tid, query));
  ipcMain.handle("bible:remove", (_e, tid) => { store.removeTranslation(tid); return store.listTranslations(); });
  ipcMain.handle("bible:import", async (_e, meta) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: "Import a Bible file",
      filters: [{ name: "Bible text or JSON", extensions: ["txt", "json"] }],
      properties: ["openFile"],
    });
    if (canceled || !filePaths[0]) return null;
    const { verses, skipped } = parseBibleFile(fs.readFileSync(filePaths[0], "utf8"));
    if (!verses.length) throw new Error("No verses were found in that file. Each line should look like: John 3:16 For God so loved the world...");
    const id = String(meta.id || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!id || !String(meta.name || "").trim()) throw new Error("Give the Bible a short code (for example KJV) and a name.");
    store.installTranslation({ id, name: meta.name.trim(), language: meta.language, license: meta.license }, verses);
    return { imported: verses.length, skipped, translations: store.listTranslations() };
  });

  // ---- Live output ----
  ipcMain.handle("live:get", () => live.get());
  ipcMain.handle("live:show", (_e, content) => live.show(content));
  ipcMain.handle("live:blank", (_e, blanked) => live.setBlank(blanked));
  ipcMain.handle("live:openAudience", () => live.openAudience(store.getSetting("audienceDisplayId")));
  ipcMain.handle("live:closeAudience", () => live.closeAudience());

  ipcMain.handle("data:integrity", () => store.integrityCheck());

  ipcMain.handle("data:backup", () => {
    const dir = path.join(app.getPath("documents"), "ChurchAI Backups");
    const file = store.backupTo(dir);
    shell.showItemInFolder(file);
    return file;
  });

  ipcMain.handle("data:export", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Export ChurchAI data",
      defaultPath: path.join(app.getPath("documents"), "churchai-export.json"),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, JSON.stringify(store.exportJson(), null, 2));
    return filePath;
  });
}

app.whenReady().then(() => {
  store = openStore(path.join(app.getPath("userData"), "churchai.db"));
  seedSampleBible();
  live = createLive((state) => {
    if (win && !win.isDestroyed()) win.webContents.send("live:state", state);
  });
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  try { store && store.close(); } catch { /* already closed */ }
});
