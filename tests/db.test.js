const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { openStore, MIGRATIONS } = require("../electron/db");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "churchai-test-"));
const file = path.join(dir, "test.db");

let store = openStore(file);
assert.strictEqual(store.schemaVersion(), MIGRATIONS.length, "schema migrated");
assert.strictEqual(store.getSetting("theme"), "dark", "default theme is dark");

store.setSetting("theme", "light");
store.setSetting("audienceDisplay", { id: 2, name: "Projector" });
assert.strictEqual(store.getSetting("theme"), "light");
assert.deepStrictEqual(store.getSetting("audienceDisplay"), { id: 2, name: "Projector" });
assert.strictEqual(store.getSetting("missing", "fb"), "fb");

assert.strictEqual(store.countApprovedRemotes(), 0);
assert.ok(store.integrityCheck().ok, "integrity check passes");

// Settings persist after closing and reopening (autosave).
store.close();
store = openStore(file);
assert.strictEqual(store.getSetting("theme"), "light", "setting persisted");
assert.strictEqual(store.schemaVersion(), MIGRATIONS.length, "reopen does not re-migrate");

// Backup produces a valid, openable database containing the saved data.
const backupFile = store.backupTo(path.join(dir, "backups"));
assert.ok(fs.existsSync(backupFile), "backup file exists");
const restored = openStore(backupFile);
assert.strictEqual(restored.getSetting("theme"), "light", "backup has the data");
assert.ok(restored.integrityCheck().ok);
restored.close();

// Export covers every table.
const exp = store.exportJson();
assert.ok(Array.isArray(exp.tables.songs) && Array.isArray(exp.tables.remote_devices));
assert.ok(exp.tables.settings.length >= 2);

store.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log("db tests passed");
