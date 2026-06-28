import type { SourceType } from "./types";

// Starter inquiries across subjects, so a learner is thinking within 10 seconds.
// Deliberately mixes the civic, the scientific, the everyday, and the textual:
// inquiry is the one skill that transfers across all of them.

export interface Starter {
  type: SourceType;
  label: string;
  source: string;
}

export const STARTERS: Starter[] = [
  {
    type: "claim",
    label: "A statistic in the news",
    source:
      "A new study finds that people who drink coffee live longer, so drinking more coffee will help you live longer.",
  },
  {
    type: "phenomenon",
    label: "Why is the sky blue?",
    source:
      "On a clear day the sky is blue, but at sunset it turns orange and red.",
  },
  {
    type: "claim",
    label: "An economics claim",
    source:
      "Raising the minimum wage always increases unemployment.",
  },
  {
    type: "question",
    label: "Something you're studying",
    source:
      "Why did the Roman Republic collapse into an empire?",
  },
  {
    type: "text",
    label: "A line of argument",
    source:
      "We should not trust eyewitness testimony in court, because human memory is unreliable and easily distorted.",
  },
  {
    type: "phenomenon",
    label: "An everyday puzzle",
    source:
      "A heavy ship made of steel floats, but a small steel nail sinks.",
  },
];
