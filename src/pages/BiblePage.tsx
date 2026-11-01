import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, Translation, Verse } from "../types";

interface Props { focusToken: number }

export default function BiblePage({ focusToken }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [tid, setTid] = useState("");
  const [book, setBook] = useState(43);
  const [chapter, setChapter] = useState(3);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Verse[] | null>(null);
  const [message, setMessage] = useState("");
  const [importMeta, setImportMeta] = useState({ id: "", name: "", license: "" });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.churchai.bibleBooks().then(setBooks);
    window.churchai.translations().then((t) => { setTranslations(t); if (t[0]) setTid((cur) => cur || t[0].id); });
  }, []);

  useEffect(() => { if (focusToken) searchRef.current?.focus(); }, [focusToken]);

  useEffect(() => {
    if (!tid) { setVerses([]); return; }
    window.churchai.chapter(tid, book, chapter).then(setVerses);
  }, [tid, book, chapter]);

  const bookInfo = books.find((b) => b.id === book);
  const bookName = bookInfo?.name ?? "";
  const selected = verses.filter((v) => from !== null && to !== null && v.verse >= Math.min(from, to) && v.verse <= Math.max(from, to));

  const goTo = (b: number, c: number, v1: number | null = null, v2: number | null = null) => {
    setBook(b); setChapter(c); setFrom(v1); setTo(v2 ?? v1); setResults(null);
  };

  const step = (dir: 1 | -1) => {
    if (!bookInfo) return;
    let b = book, c = chapter + dir;
    if (c < 1) { b = book === 1 ? 66 : book - 1; c = books[b - 1].chapters; }
    else if (c > bookInfo.chapters) { b = book === 66 ? 1 : book + 1; c = 1; }
    goTo(b, c);
  };

  const submitSearch = async () => {
    const q = query.trim();
    setMessage("");
    if (!q) return;
    const ref = await window.churchai.parseReference(q);
    if (ref) { goTo(ref.book, ref.chapter ?? 1, ref.verseStart, ref.verseEnd); return; }
    if (!tid) { setMessage("Install a Bible first."); return; }
    const found = await window.churchai.searchBible(tid, q);
    setResults(found);
    if (!found.length) setMessage(`No verses contain "${q}" in this Bible.`);
  };

  const showList = useCallback(async (list: Verse[]) => {
    if (!list.length) { setMessage("Select a verse first."); return; }
    const a = list[0].verse, z = list[list.length - 1].verse;
    const title = `${bookName} ${chapter}:${a}${z !== a ? "–" + z : ""} (${tid})`;
    const body = list.length === 1 ? list[0].text : list.map((v) => `${v.verse} ${v.text}`).join("\n");
    await window.churchai.showLive({ title, body });
    setMessage("");
  }, [tid, bookName, chapter]);

  const clickVerse = (n: number, shift: boolean) => {
    if (shift && from !== null) setTo(n); else { setFrom(n); setTo(n); }
  };

  const importFile = async () => {
    try {
      const r = await window.churchai.importBible(importMeta);
      if (!r) return;
      setTranslations(r.translations);
      setTid(importMeta.id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ""));
      setMessage(`Imported ${r.imported} verses${r.skipped ? ` (${r.skipped} lines skipped)` : ""}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") : String(e));
    }
  };

  const remove = async (id: string) => {
    const left = await window.churchai.removeTranslation(id);
    setTranslations(left);
    if (tid === id) setTid(left[0]?.id ?? "");
  };

  return (
    <section className="page">
      <h1>Bible library</h1>

      <div className="panel">
        <div className="bible-search">
          <input
            ref={searchRef} className="input grow" value={query} placeholder="Type a reference like John 3:16, or words from a verse"
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            aria-label="Search the Bible"
          />
          <button className="btn" onClick={submitSearch}>Search</button>
        </div>
        <div className="pickers">
          <select className="input" value={tid} onChange={(e) => setTid(e.target.value)} aria-label="Translation">
            {!translations.length && <option value="">No Bible installed</option>}
            {translations.map((t) => <option key={t.id} value={t.id}>{t.id} – {t.name}</option>)}
          </select>
          <select className="input" value={book} onChange={(e) => goTo(+e.target.value, 1)} aria-label="Book">
            {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="input" value={chapter} onChange={(e) => goTo(book, +e.target.value)} aria-label="Chapter">
            {Array.from({ length: bookInfo?.chapters ?? 1 }, (_, i) => <option key={i + 1} value={i + 1}>Chapter {i + 1}</option>)}
          </select>
          <button className="btn quiet" onClick={() => step(-1)} aria-label="Previous chapter">Previous</button>
          <button className="btn quiet" onClick={() => step(1)} aria-label="Next chapter">Next</button>
        </div>
        {message && <p className="notice" role="status">{message}</p>}
      </div>

      {results ? (
        <div className="panel">
          <h2>{results.length} verse{results.length === 1 ? "" : "s"} found</h2>
          {results.map((v) => (
            <button key={`${v.book}-${v.chapter}-${v.verse}`} className="verse result" onClick={() => goTo(v.book, v.chapter, v.verse)}>
              <strong>{books[v.book - 1]?.name} {v.chapter}:{v.verse}</strong> {v.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="panel">
          <div className="chapter-head">
            <h2>{bookName} {chapter}</h2>
            <button className="btn" onClick={() => showList(selected)} disabled={!selected.length}>Show live</button>
          </div>
          {!tid && <p className="muted">Import a Bible below to start.</p>}
          {tid && !verses.length && <p className="muted">This Bible has no verses for this chapter. The sample only includes a few passages; import a full Bible below.</p>}
          {verses.map((v) => (
            <button
              key={v.verse}
              className={"verse" + (selected.some((s) => s.verse === v.verse) ? " picked" : "")}
              onClick={(e) => clickVerse(v.verse, e.shiftKey)}
              onDoubleClick={() => { setFrom(v.verse); setTo(v.verse); showList([v]); }}
            >
              <sup>{v.verse}</sup> {v.text}
            </button>
          ))}
          {verses.length > 0 && <p className="muted hint">Click a verse to select it, Shift+click to extend, double-click to show it live.</p>}
        </div>
      )}

      <div className="panel">
        <h2>Installed Bibles</h2>
        {translations.map((t) => (
          <div className="tr-row" key={t.id}>
            <span><strong>{t.id}</strong> {t.name} <span className="muted">· {t.verseCount.toLocaleString()} verses{t.license ? ` · ${t.license}` : ""}</span></span>
            <button className="btn quiet" onClick={() => remove(t.id)}>Remove</button>
          </div>
        ))}
        <h2 className="sub">Import a Bible</h2>
        <p className="muted">Use a Bible you have permission to use. The file is plain text with one verse per line, like “John 3:16 For God so loved the world…”, or a JSON file.</p>
        <div className="pickers">
          <input className="input" style={{ width: 90 }} placeholder="Code" value={importMeta.id} onChange={(e) => setImportMeta({ ...importMeta, id: e.target.value })} aria-label="Short code, for example KJV" />
          <input className="input grow" placeholder="Name, for example World English Bible" value={importMeta.name} onChange={(e) => setImportMeta({ ...importMeta, name: e.target.value })} aria-label="Bible name" />
          <input className="input" placeholder="Licence (optional)" value={importMeta.license} onChange={(e) => setImportMeta({ ...importMeta, license: e.target.value })} aria-label="Licence" />
          <button className="btn" onClick={importFile}>Choose file…</button>
        </div>
      </div>
    </section>
  );
}
