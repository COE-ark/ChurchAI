import type { LiveState, Status } from "../types";

type Tone = "ok" | "idle" | "warn";
function Row({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="status-row">
      <span className={"dot " + tone} aria-hidden="true" />
      <span className="status-label">{label}</span>
      <span className="status-value">{value}</span>
    </div>
  );
}

export default function Dashboard({ status, live, audienceDisplayId, onNavigate }: { status: Status | null; live: LiveState; audienceDisplayId: number | null; onNavigate: (id: string) => void }) {
  const displays = status?.displays ?? [];
  const audience = displays.find((d) => d.id === audienceDisplayId) ?? displays.find((d) => !d.primary);
  const activeDisplay = audience
    ? `${audience.label} (${audience.width}×${audience.height})`
    : displays.length
    ? "Only the operator screen is connected"
    : "Checking…";

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <div className="dash-grid">
        <div className="panel">
          <h2>Status</h2>
          <Row label="Current presentation" value="None loaded" tone="idle" />
          <Row label="Live on screen" value={live.content ? (live.blanked ? "Blanked" : live.content.title) : "Nothing"} tone={live.content && !live.blanked ? "ok" : "idle"} />
          <Row label="Audience display" value={activeDisplay} tone={audience ? "ok" : "warn"} />
          <Row label="Microphone" value="Off" tone="idle" />
          <Row label="AI detection" value="Not running" tone="idle" />
          <Row label="NDI output" value="Not set up" tone="idle" />
          <Row
            label="Remote devices"
            value={status ? `${status.approvedRemotes} approved` : "Checking…"}
            tone="idle"
          />
          <Row
            label="Internet"
            value={status ? (status.internetOnline ? "Online" : "Offline (ChurchAI works offline)") : "Checking…"}
            tone={status?.internetOnline ? "ok" : "idle"}
          />
        </div>
        <div className="panel">
          <h2>Get started</h2>
          <p className="muted">Look up a verse and show it on the audience screen.</p>
          <div className="actions">
            <button className="btn quiet" onClick={() => onNavigate("settings")}>Back up your data</button>
            <button className="btn" onClick={() => onNavigate("bible")}>Open Bible library</button>
          </div>
        </div>
      </div>
    </section>
  );
}
