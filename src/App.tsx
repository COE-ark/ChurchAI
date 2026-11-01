import { useCallback, useEffect, useState } from "react";
import { NAV } from "./nav";
import type { LiveState, Settings, Status } from "./types";
import LiveBar from "./LiveBar";
import BiblePage from "./pages/BiblePage";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import ComingSoon from "./pages/ComingSoon";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [settings, setSettings] = useState<Settings>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [live, setLive] = useState<LiveState>({ audienceOpen: false, blanked: false, content: null });
  const [bibleFocus, setBibleFocus] = useState(0);

  const refreshStatus = useCallback(() => {
    window.churchai.getStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    window.churchai.getSettings().then(setSettings);
    refreshStatus();
    const timer = setInterval(refreshStatus, 5000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    window.churchai.getLive().then(setLive);
    return window.churchai.onLiveState(setLive);
  }, []);

  // Keyboard shortcuts. Plain keys are ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setPage("bible");
        setBibleFocus((n) => n + 1);
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "b" || e.key === "B") window.churchai.setBlank(true);
      else if (e.key === "f" || e.key === "F") window.churchai.setBlank(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const theme = settings.theme === "light" ? "light" : "dark";
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const updateSetting = async (key: string, value: unknown) => {
    setSettings(await window.churchai.setSetting(key, value));
  };

  const audienceId = typeof settings.audienceDisplayId === "number" ? settings.audienceDisplayId : null;
  const item = NAV.flatMap((g) => g.items).find((i) => i.id === page)!;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main navigation">
        <div className="brand">ChurchAI</div>
        {NAV.map((group) => (
          <div className="group" key={group.title}>
            <div className="group-title">{group.title}</div>
            {group.items.map((i) => (
              <button
                key={i.id}
                className={"nav-item" + (i.id === page ? " active" : "")}
                aria-current={i.id === page ? "page" : undefined}
                onClick={() => setPage(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <main className="content">
        {page === "dashboard" && <Dashboard status={status} live={live} audienceDisplayId={audienceId} onNavigate={setPage} />}
        {page === "bible" && <BiblePage focusToken={bibleFocus} />}
        {page === "settings" && (
          <SettingsPage settings={settings} status={status} onChange={updateSetting} />
        )}
        {page !== "dashboard" && page !== "settings" && page !== "bible" && (
          <ComingSoon title={item.label} milestone={item.milestone!} blurb={item.blurb!} />
        )}
      </main>
      <LiveBar live={live} status={status} audienceDisplayId={audienceId} onPickDisplay={(id) => updateSetting("audienceDisplayId", Number.isFinite(id) && id > 0 ? id : null)} />
    </div>
  );
}
