// Live output: owns the audience window and the "what is on screen now" state.
const { BrowserWindow, screen } = require("electron");
const path = require("path");

function createLive(onState) {
  let audienceWin = null;
  const state = { audienceOpen: false, blanked: false, content: null };

  const publish = () => {
    state.audienceOpen = !!audienceWin && !audienceWin.isDestroyed();
    if (state.audienceOpen) audienceWin.webContents.send("live:update", state);
    onState({ ...state });
  };

  return {
    get: () => ({ ...state, audienceOpen: !!audienceWin && !audienceWin.isDestroyed() }),
    show(content) {
      state.content = { title: String(content.title || ""), body: String(content.body || "") };
      state.blanked = false;
      publish();
    },
    setBlank(blanked) {
      state.blanked = !!blanked;
      publish();
    },
    openAudience(displayId) {
      if (audienceWin && !audienceWin.isDestroyed()) { audienceWin.focus(); return; }
      const displays = screen.getAllDisplays();
      const target = displays.find((d) => d.id === displayId) || displays.find((d) => d.id !== screen.getPrimaryDisplay().id);
      const common = {
        backgroundColor: "#000000",
        title: "ChurchAI audience screen",
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, "audience", "audience-preload.js"),
          contextIsolation: true, nodeIntegration: false, sandbox: true,
        },
      };
      // With a second display the audience window fills it. With only one display it opens as a normal
      // window so it never covers the operator controls.
      audienceWin = target
        ? new BrowserWindow({ ...common, x: target.bounds.x, y: target.bounds.y, width: target.bounds.width, height: target.bounds.height, frame: false, fullscreen: true })
        : new BrowserWindow({ ...common, width: 960, height: 540 });
      audienceWin.setMenuBarVisibility(false);
      audienceWin.loadFile(path.join(__dirname, "audience", "index.html"));
      audienceWin.webContents.on("before-input-event", (e, input) => {
        if (input.type === "keyDown" && input.key === "Escape") { audienceWin.close(); }
      });
      audienceWin.webContents.on("did-finish-load", publish);
      audienceWin.on("closed", () => { audienceWin = null; publish(); });
    },
    closeAudience() {
      if (audienceWin && !audienceWin.isDestroyed()) audienceWin.close();
    },
  };
}

module.exports = { createLive };
