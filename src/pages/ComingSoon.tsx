export default function ComingSoon({ title, milestone, blurb }: { title: string; milestone: number; blurb: string }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <div className="panel pending">
        <p>{blurb}</p>
        <p className="muted">This section is not built yet. It arrives in Milestone {milestone}.</p>
      </div>
    </section>
  );
}
