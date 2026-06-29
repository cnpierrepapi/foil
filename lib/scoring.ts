import {
  DIMENSIONS,
  type Dimension,
  type EpisodeStats,
  type Scores,
  type Turn,
} from "./types";

// An episode is this many coach exchanges. Hit it and the episode ends.
export const EPISODE_LENGTH = 14;

type CoachTurn = Extract<Turn, { role: "coach" }>;

export function coachTurns(turns: Turn[]): CoachTurn[] {
  return turns.filter((t): t is CoachTurn => t.role === "coach");
}

export function exchangeCount(turns: Turn[]): number {
  return coachTurns(turns).length;
}

// Average each trait's 0..5 score across every coach turn in the run.
export function traitAverages(turns: Turn[]): Scores {
  const coach = coachTurns(turns);
  const out = { curiosity: 0, specificity: 0, assumptions: 0, evidence: 0 } as Scores;
  if (coach.length === 0) return out;
  for (const d of DIMENSIONS) {
    const sum = coach.reduce((s, t) => s + (t.scores[d] ?? 0), 0);
    out[d] = sum / coach.length;
  }
  return out;
}

// Map the average trait quality (0..5) onto the headline Mastery scale (1.00..4.99).
// avg 0 -> 1.00, avg 5 -> 4.99. Two decimals.
export function masteryFromAverages(avg: Scores): number {
  const mean = DIMENSIONS.reduce((s, d) => s + avg[d], 0) / DIMENSIONS.length;
  const scaled = 1 + (mean / 5) * 3.99;
  return Math.round(Math.min(4.99, Math.max(1, scaled)) * 100) / 100;
}

export function episodeStats(turns: Turn[]): EpisodeStats {
  const avg = traitAverages(turns);
  let strongest: Dimension = DIMENSIONS[0];
  let weakest: Dimension = DIMENSIONS[0];
  for (const d of DIMENSIONS) {
    if (avg[d] > avg[strongest]) strongest = d;
    if (avg[d] < avg[weakest]) weakest = d;
  }
  return {
    exchanges: exchangeCount(turns),
    traitAverages: avg,
    mastery: masteryFromAverages(avg),
    strongest,
    weakest,
  };
}

export function masteryBand(m: number): string {
  if (m >= 4.5) return "Exceptional";
  if (m >= 3.75) return "Sharp";
  if (m >= 3.0) return "Developing";
  if (m >= 2.25) return "Emerging";
  return "Getting started";
}
