// A small sparkline of total reasoning score across the learner's moves.
// It is the "ladder": you can watch your own questions get sharper over a session.

export function Spark({ totals }: { totals: number[] }) {
  if (totals.length < 2) return null;
  const max = 20; // four dimensions x 5
  const w = 132;
  const h = 34;
  const pad = 3;
  const step = (w - pad * 2) / (totals.length - 1);
  const points = totals.map((t, i) => {
    const x = pad + i * step;
    const y = h - pad - (t / max) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="flex items-center gap-2.5">
      <svg width={w} height={h} className="overflow-visible">
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent" />
        <circle cx={last[0]} cy={last[1]} r="2.5" className="fill-accent" />
      </svg>
      <span className="text-[0.7rem] leading-tight text-ink/50">
        sharpness
        <br />
        over time
      </span>
    </div>
  );
}
