import type { LiveState, Status } from "./types";

interface Props {
  live: LiveState;
  status: Status | null;
  audienceDisplayId: number | null;
  onPickDisplay: (id: number) => void;
}

export default function LiveBar({ live, status, audienceDisplayId, onPickDisplay }: Props) {
  const displays = status?.displays ?? [];
  const what = !live.content ? "Nothing is on the audience screen" : live.blanked ? "Screen blanked" : live.content.title;
  return (
    <footer className="livebar" aria-label="Live output">
      <div className="live-now">
        <span className={"dot " + (live.audienceOpen && live.content && !live.blanked ? "ok" : "idle")} aria-hidden="true" />
        <div>
          <div className="live-title">{what}</div>
          {live.content && !live.blanked && <div className="live-text">{live.content.body}</div>}
        </div>
      </div>
      <select className="input" aria-label="Audience display" value={audienceDisplayId ?? ""} onChange={(e) => onPickDisplay(+e.target.value)}>
        <option value="">Automatic (second screen if present)</option>
        {displays.map((d) => <option key={d.id} value={d.id}>{d.label} {d.width}×{d.height}{d.primary ? " (this screen)" : ""}</option>)}
      </select>
      {live.audienceOpen
        ? <button className="btn quiet" onClick={() => window.churchai.closeAudience()}>Close audience screen</button>
        : <button className="btn" onClick={() => window.churchai.openAudience()}>Open audience screen</button>}
      {live.blanked
        ? <button className="btn" onClick={() => window.churchai.setBlank(false)}>Show again (F)</button>
        : <button className="btn quiet" onClick={() => window.churchai.setBlank(true)}>Blank (B)</button>}
    </footer>
  );
}
