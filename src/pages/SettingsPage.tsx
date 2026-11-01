import { useState } from "react";
import type { Settings, Status } from "../types";

interface Props {
  settings: Settings;
  status: Status | null;
  onChange: (key: string, value: unknown) => Promise<void>;
}

export default function SettingsPage({ settings, status, onChange }: Props) {
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { setMessage(await fn()); }
    catch (e) { setMessage("That did not work: " + (e instanceof Error ? e.message : String(e))); }
    finally { setBusy(false); }
  };

  const theme = settings.theme === "light" ? "light" : "dark";

  return (
    <section className="page">
      <h1>Settings</h1>

      <div className="panel">
        <h2>Appearance</h2>
        <div className="segmented" role="group" aria-label="Colour theme">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} className={t === theme ? "on" : ""} aria-pressed={t === theme} onClick={() => onChange("theme", t)}>
              {t === "dark" ? "Dark" : "Light"}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Your data</h2>
        <p className="muted">
          Everything is stored on this computer{status ? ` in ${status.dataFolder}` : ""}. Changes save automatically.
        </p>
        <div className="actions">
          <button className="btn" disabled={busy} onClick={() => run(async () => {
            const r = await window.churchai.checkIntegrity();
            return r.ok ? "Database check passed." : "Database problems found: " + r.messages.join("; ");
          })}>Check database</button>
          <button className="btn" disabled={busy} onClick={() => run(async () => {
            const f = await window.churchai.backupNow();
            return "Backup saved to " + f;
          })}>Back up now</button>
          <button className="btn quiet" disabled={busy} onClick={() => run(async () => {
            const f = await window.churchai.exportData();
            return f ? "Data exported to " + f : "Export cancelled.";
          })}>Export data</button>
        </div>
        {message && <p className="notice" role="status">{message}</p>}
      </div>

      <div className="panel">
        <h2>About</h2>
        <p className="muted">
          ChurchAI {status?.appVersion ?? ""}. Database version {status?.schemaVersion ?? "…"}.
        </p>
      </div>
    </section>
  );
}
