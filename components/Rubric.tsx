import { DIMENSIONS, DIMENSION_LABELS, type Scores } from "@/lib/types";

// The live "thinking quality" meter for a single move. The point is not the
// number; it is making an invisible skill visible so the learner can feel it improve.

export function Rubric({ scores }: { scores: Scores }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
      {DIMENSIONS.map((d) => {
        const value = Math.max(0, Math.min(5, scores[d]));
        return (
          <div key={d} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-ink/55">
                {DIMENSION_LABELS[d]}
              </span>
              <span className="font-mono text-[0.7rem] text-ink/45">{value}/5</span>
            </div>
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < value ? "bg-accent" : "bg-ink/10"
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
