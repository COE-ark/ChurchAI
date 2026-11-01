# ChurchAI

Free church presentation, Bible projection and worship management software (Windows first).

## Status: Milestone 2 done (Bible library and live projection); Milestone 1 before it

Working now:
- Electron desktop shell with secure preload bridge (no Node access in the UI)
- SQLite database (Node's built-in `node:sqlite`, no native build step) with versioned migrations
- Schema for Bible translations, songs, presentations, slides, themes, media, services, sermons, remote devices
- Dashboard with a live status panel (displays, internet, approved remotes)
- Dark/light theme saved to the database
- Settings: database integrity check, backup (to Documents/ChurchAI Backups), JSON export

Milestone 2 adds:
- Bible library: pick translation, book and chapter; type a reference (John 3:16, 1 John 2:1-5, Psalm 23) or words from a verse
- Click a verse (Shift+click for a range, double-click to show) and send it to the audience screen
- Audience window: fills the second display (or opens as a normal window if you have one screen); shows only the verse, no controls or pointer
- Blank (B) and show again (F) keys, Ctrl+B to jump to Bible search, shortcuts ignored while typing
- Import your own Bible (plain text, one verse per line, or JSON); remove Bibles
- A small public-domain King James excerpt is installed on first run so you can try it straight away

Not built yet (also later in Milestone 2 scope): comparing translations, favourites and scripture collections.

Not built yet: every other section is marked with the milestone that delivers it.

## Run

Requires Node.js 22 or newer.

    npm install
    npm test        # database tests
    npm run dev     # development with hot reload
    npm start       # build and run

## Build the Windows installer

    npm run dist    # output in release/

Or push to GitHub and run the "Build Windows installer" workflow.
