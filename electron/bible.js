// Bible book list, reference parsing and Bible file import. No database access here.
const BOOKS = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
  ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
  ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
  ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9],
  ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
  ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4], ["Matthew", 28],
  ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16],
  ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6], ["Philippians", 4],
  ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3], ["1 Timothy", 6], ["2 Timothy", 4],
  ["Titus", 3], ["Philemon", 1], ["Hebrews", 13], ["James", 5], ["1 Peter", 5],
  ["2 Peter", 3], ["1 John", 5], ["2 John", 1], ["3 John", 1], ["Jude", 1], ["Revelation", 22],
].map(([name, chapters], i) => ({ id: i + 1, name, chapters }));

// Extra spellings that prefix matching cannot work out by itself.
const EXTRA_ALIASES = {
  ps: 19, psalm: 19, psa: 19, pss: 19, prov: 20, pr: 20, song: 22, songofsongs: 22, sos: 22, songs: 22,
  eccl: 21, eccles: 21, qoh: 21, ezek: 26, eze: 26, jn: 43, jhn: 43, phil: 50, php: 50, pp: 50,
  phm: 57, philem: 57, jas: 59, jm: 59, rev: 66, revelations: 66, apocalypse: 66,
  "1jn": 62, "2jn": 63, "3jn": 64, "1jo": 62, "2jo": 63, "3jo": 64, jd: 65, jude: 65, judg: 7, jdg: 7,
  matt: 40, mt: 40, mk: 41, lk: 42, lu: 42, rom: 45, gal: 48, eph: 49, col: 51, heb: 58,
  "1cor": 46, "2cor": 47, "1thess": 52, "2thess": 53, "1tim": 54, "2tim": 55, "1pet": 60, "2pet": 61,
  "1sam": 9, "2sam": 10, "1kgs": 11, "2kgs": 12, "1chr": 13, "2chr": 14, deut: 5, dt: 5, num: 4, lev: 3,
};

const ORDINALS = { first: "1", second: "2", third: "3", i: "1", ii: "2", iii: "3" };

function normalize(s) {
  let t = String(s).toLowerCase().trim().replace(/\./g, " ").replace(/\s+/g, " ");
  const m = t.match(/^(first|second|third|iii|ii|i)\s+(.*)$/);
  if (m) t = ORDINALS[m[1]] + " " + m[2];
  return t.replace(/[^a-z0-9]/g, "");
}

const FULL_KEYS = BOOKS.map((b) => normalize(b.name));

function resolveBook(text) {
  const key = normalize(text);
  if (!key) return null;
  if (EXTRA_ALIASES[key]) return EXTRA_ALIASES[key];
  const exact = FULL_KEYS.indexOf(key);
  if (exact >= 0) return exact + 1;
  if (key.length < 3) return null;
  const hits = [];
  FULL_KEYS.forEach((k, i) => { if (k.startsWith(key)) hits.push(i + 1); });
  return hits.length === 1 ? hits[0] : null;
}

// Understands "John 3:16", "1 John 2:1-5", "Psalm 23", "john chapter 3 verse 16", "Romans 8".
function parseReference(input) {
  if (!input) return null;
  let t = String(input).toLowerCase()
    .replace(/\b(the\s+)?(gospel|book|epistle|letter)\s+(according\s+)?(to|of)\s+(the\s+)?/g, " ")
    .replace(/\bchapters?\b/g, " ")
    .replace(/\bverses?\b/g, ":")
    .replace(/\s+(to|through|thru)\s+/g, "-")
    .trim();
  const m = t.match(/^((?:[123]|first|second|third|iii|ii|i)?\s*[a-z][a-z .]*?)\s*(\d+)?\s*(?:[:.]\s*(\d+)\s*(?:[-–]\s*(\d+))?)?\s*$/);
  if (!m) return null;
  const book = resolveBook(m[1]);
  if (!book) return null;
  const info = BOOKS[book - 1];
  const chapter = m[2] ? parseInt(m[2], 10) : null;
  if (chapter !== null && (chapter < 1 || chapter > info.chapters)) return null;
  const verseStart = m[3] ? parseInt(m[3], 10) : null;
  let verseEnd = m[4] ? parseInt(m[4], 10) : verseStart;
  if (verseStart !== null && verseEnd < verseStart) verseEnd = verseStart;
  if (chapter === null && verseStart !== null) return null;
  return { book, chapter, verseStart, verseEnd };
}

// Accepts plain text lines ("John 3:16 For God so loved...") or JSON ({ verses: [{book, chapter, verse, text}] }).
function parseBibleFile(content) {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  const verses = [];
  let skipped = 0;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    const list = Array.isArray(data) ? data : data.verses;
    if (!Array.isArray(list)) throw new Error("JSON file has no verses list");
    for (const v of list) {
      const book = typeof v.book === "number" ? v.book : resolveBook(v.book);
      if (book >= 1 && book <= 66 && v.chapter > 0 && v.verse > 0 && v.text) {
        verses.push({ book, chapter: +v.chapter, verse: +v.verse, text: String(v.text).trim() });
      } else skipped++;
    }
  } else {
    for (const line of trimmed.split(/\r?\n/)) {
      if (!line.trim() || line.startsWith("#")) continue;
      const m = line.match(/^\s*(.+?)\s+(\d+)\s*[:.]\s*(\d+)\s*[\t ]\s*(.+?)\s*$/);
      const book = m ? resolveBook(m[1]) : null;
      if (book) verses.push({ book, chapter: +m[2], verse: +m[3], text: m[4] });
      else skipped++;
    }
  }
  return { verses, skipped };
}

module.exports = { BOOKS, resolveBook, parseReference, parseBibleFile };
