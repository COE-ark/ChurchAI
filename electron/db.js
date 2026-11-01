// ChurchAI local database (SQLite via Node's built-in node:sqlite - no native build needed).
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

// Each entry upgrades the schema by one version. Never edit old entries; append new ones.
const MIGRATIONS = [
  `
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE translations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, language TEXT, license TEXT,
    installed INTEGER NOT NULL DEFAULT 1, installed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT, language TEXT,
    category TEXT, tags TEXT, lyrics TEXT NOT NULL DEFAULT '', favourite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE presentations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'text', content TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
    definition TEXT NOT NULL DEFAULT '{}', builtin INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE media (
    id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, kind TEXT, category TEXT,
    favourite INTEGER NOT NULL DEFAULT 0, added_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, is_template INTEGER NOT NULL DEFAULT 0,
    service_date TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE service_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, ref TEXT
  );
  CREATE TABLE sermons (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, preached_on TEXT,
    transcript TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE remote_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, token_hash TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0, last_seen TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE verses (
    translation_id TEXT NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, text TEXT NOT NULL,
    PRIMARY KEY (translation_id, book, chapter, verse)
  ) WITHOUT ROWID;
  `,
];

const EXPORT_TABLES = [
  "settings", "translations", "songs", "presentations", "slides", "themes",
  "media", "services", "service_items", "sermons", "remote_devices",
];

const DEFAULT_SETTINGS = { theme: "dark" };

function migrate(db) {
  let version = db.prepare("PRAGMA user_version").get().user_version;
  for (; version < MIGRATIONS.length; version++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  return version;
}

function openStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  const insertDefault = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertDefault.run(k, JSON.stringify(v));

  return {
    file,
    schemaVersion: () => db.prepare("PRAGMA user_version").get().user_version,
    getSetting(key, fallback = null) {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
      return row ? JSON.parse(row.value) : fallback;
    },
    setSetting(key, value) {
      db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).run(key, JSON.stringify(value));
    },
    allSettings() {
      const out = {};
      for (const r of db.prepare("SELECT key, value FROM settings").all()) out[r.key] = JSON.parse(r.value);
      return out;
    },
    countApprovedRemotes() {
      return db.prepare("SELECT COUNT(*) AS n FROM remote_devices WHERE approved = 1").get().n;
    },
    integrityCheck() {
      const rows = db.prepare("PRAGMA integrity_check").all();
      const messages = rows.map((r) => r.integrity_check);
      return { ok: messages.length === 1 && messages[0] === "ok", messages };
    },
    // VACUUM INTO writes a consistent copy even while the database is in use.
    backupTo(dir) {
      fs.mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const target = path.join(dir, `churchai-backup-${stamp}.db`);
      db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
      return target;
    },
    exportJson() {
      const data = { app: "ChurchAI", schemaVersion: this.schemaVersion(), exportedAt: new Date().toISOString(), tables: {} };
      for (const t of EXPORT_TABLES) data.tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
      return data;
    },
    // ---- Bible ----
    listTranslations() {
      return db.prepare(
        `SELECT t.id, t.name, t.language, t.license,
                (SELECT COUNT(*) FROM verses v WHERE v.translation_id = t.id) AS verseCount
         FROM translations t WHERE t.installed = 1 ORDER BY t.name`
      ).all();
    },
    installTranslation(meta, verses) {
      const ins = db.prepare("INSERT OR REPLACE INTO verses (translation_id, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)");
      db.exec("BEGIN");
      try {
        db.prepare("DELETE FROM verses WHERE translation_id = ?").run(meta.id);
        db.prepare(
          `INSERT INTO translations (id, name, language, license, installed) VALUES (?, ?, ?, ?, 1)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, language = excluded.language, license = excluded.license, installed = 1`
        ).run(meta.id, meta.name, meta.language || null, meta.license || null);
        for (const v of verses) ins.run(meta.id, v.book, v.chapter, v.verse, v.text);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return verses.length;
    },
    removeTranslation(id) {
      db.prepare("DELETE FROM verses WHERE translation_id = ?").run(id);
      db.prepare("DELETE FROM translations WHERE id = ?").run(id);
    },
    getChapter(translationId, book, chapter) {
      return db.prepare(
        "SELECT book, chapter, verse, text FROM verses WHERE translation_id = ? AND book = ? AND chapter = ? ORDER BY verse"
      ).all(translationId, book, chapter);
    },
    getVerses(translationId, book, chapter, from, to) {
      return db.prepare(
        "SELECT book, chapter, verse, text FROM verses WHERE translation_id = ? AND book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse"
      ).all(translationId, book, chapter, from, to);
    },
    searchVerses(translationId, query, limit = 50) {
      const words = String(query).toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
      if (!words.length) return [];
      const esc = (w) => w.replace(/[\\%_]/g, (c) => "\\" + c);
      const where = words.map(() => "LOWER(text) LIKE ? ESCAPE '\\'").join(" AND ");
      return db.prepare(
        `SELECT book, chapter, verse, text FROM verses WHERE translation_id = ? AND ${where} ORDER BY book, chapter, verse LIMIT ?`
      ).all(translationId, ...words.map((w) => `%${esc(w)}%`), limit);
    },
    close: () => db.close(),
  };
}

module.exports = { openStore, MIGRATIONS };
