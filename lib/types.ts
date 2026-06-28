// Core data model for a Foil inquiry session.
// Everything here is stored locally in the browser. No account, no server copy.

export type SourceType = "claim" | "text" | "question" | "phenomenon";

// The four dimensions of reasoning quality the coach scores each turn on.
// These are the things that stay scarce and human as AI commoditizes answers:
// knowing what to ask, and how to weigh what comes back.
export const DIMENSIONS = ["curiosity", "specificity", "assumptions", "evidence"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  curiosity: "Curiosity",
  specificity: "Specificity",
  assumptions: "Assumptions",
  evidence: "Evidence",
};

export const DIMENSION_BLURBS: Record<Dimension, string> = {
  curiosity: "Opening the question up rather than closing it down.",
  specificity: "Asking something precise enough to actually answer.",
  assumptions: "Naming the premises hiding inside the question.",
  evidence: "Reaching for proof, mechanism, or a counter-example.",
};

export type Scores = Record<Dimension, number>; // each 0..5

export type Turn =
  | { role: "learner"; text: string }
  | {
      role: "coach";
      text: string; // the Socratic reply (never the answer)
      scores: Scores; // assessment of the learner turn it responds to
      observation: string;
      nextNudge: string;
    };

export interface Session {
  id: string;
  source: string;
  sourceType: SourceType;
  turns: Turn[];
  createdAt: number;
}

export interface CoachResponse {
  coachReply: string;
  refusedToAnswer: boolean;
  scores: Scores;
  observation: string;
  nextNudge: string;
}
