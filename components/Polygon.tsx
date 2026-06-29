import { DIMENSIONS, DIMENSION_LABELS, type Scores } from "@/lib/types";

// The mind-map: a four-axis radar of the reasoning traits. Each axis runs 0..5.
// Curiosity is top, then clockwise: Specificity, Assumptions, Evidence.

const ANGLES: Record<(typeof DIMENSIONS)[number], number> = {
  curiosity: -90,
  specificity: 0,
  assumptions: 90,
  evidence: 180,
};

function point(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

export function Polygon({
  scores,
  size = 240,
  showValues = true,
}: {
  scores: Scores;
  size?: number;
  showValues?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;

  const verts = DIMENSIONS.map((d) => {
    const r = (Math.max(0, Math.min(5, scores[d])) / 5) * R;
    return point(cx, cy, r, ANGLES[d]);
  });
  const path = verts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + "Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* grid rings */}
      {[1, 2, 3, 4, 5].map((ring) => {
        const rr = (ring / 5) * R;
        const ringPath =
          DIMENSIONS.map((d, i) => {
            const [x, y] = point(cx, cy, rr, ANGLES[d]);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ") + "Z";
        return <path key={ring} d={ringPath} className="fill-none stroke-ink/10" strokeWidth="1" />;
      })}
      {/* axes */}
      {DIMENSIONS.map((d) => {
        const [x, y] = point(cx, cy, R, ANGLES[d]);
        return <line key={d} x1={cx} y1={cy} x2={x} y2={y} className="stroke-ink/10" strokeWidth="1" />;
      })}
      {/* filled value polygon */}
      <path d={path} className="fill-accent/20 stroke-accent" strokeWidth="2" strokeLinejoin="round" />
      {verts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" className="fill-accent" />
      ))}
      {/* labels */}
      {DIMENSIONS.map((d) => {
        const [lx, ly] = point(cx, cy, R + 18, ANGLES[d]);
        const anchor = ANGLES[d] === 0 ? "start" : ANGLES[d] === 180 ? "end" : "middle";
        return (
          <text
            key={d}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-ink/60 text-[10px] font-medium"
          >
            {DIMENSION_LABELS[d]}
            {showValues ? ` ${scores[d].toFixed(1)}` : ""}
          </text>
        );
      })}
    </svg>
  );
}
