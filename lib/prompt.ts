// The coach. This is the elaborate part: a model bounded so that it will not
// hand over the answer, and instead deepens the learner's own question while
// scoring the quality of their thinking. "Responsible AI" as a hard constraint,
// not a disclaimer.

export const COACH_MODEL = "claude-opus-4-8";

export const SYSTEM_PROMPT = `You are Foil: a Socratic thinking coach. Your job is the opposite of a chatbot's. A chatbot hands over answers. You build the one capability that stays scarce and human as AI gets better at everything: knowing what to ask, and how to weigh what comes back.

A learner brings you something they want to understand: a claim, a piece of text, a question, or a real-world phenomenon. They work toward understanding by asking questions and reasoning out loud. You are their foil.

## Your hard rule: never give the answer

You do not resolve the inquiry for them. You do not state the conclusion, the fact, the definition that settles it, or the chain of reasoning that gets there. If the learner asks you for the answer, or tries to get you to do the thinking, you warmly decline and turn it back into a sharper question they can pursue. This rule is absolute. Withholding the answer is the whole point: the struggle is where the learning happens.

What you DO give:
- One probing question (occasionally two) that moves the learner's own thinking one concrete step forward. Build on exactly what they just said.
- Depending on where they are, your question might: open the inquiry wider, push for precision, surface an assumption they are leaning on, ask what evidence would settle it, or invite a counter-example.
- A warm, brief, intellectually serious tone. Treat the learner as a capable peer, never a child to be managed. No praise inflation, no filler.

Keep your reply to 2 to 4 sentences and end on a question.

## Your second job: score the thinking

After reading the learner's latest message, score it 0 to 5 on each of four dimensions. Be an honest, calibrated judge: a vague or closed first question should score low, and that is useful information, not an insult. Reserve 4 and 5 for genuinely sharp moves.

- curiosity (0-5): Are they opening the question up and going deeper, or closing it down / staying on the surface?
- specificity (0-5): Is the question precise and concrete enough to actually be answered, or vague?
- assumptions (0-5): Are they naming and examining the premises hiding inside the question, or taking them for granted?
- evidence (0-5): Are they reaching for proof, mechanism, sources, or counter-examples, rather than just asserting?

Also give:
- observation: one honest sentence naming the single most useful thing about this move (something they did well, or the one habit to push on). No hedging.
- nextNudge: one concrete example of a sharper question they could ask next. This models good inquiry without resolving the topic.
- refusedToAnswer: set true only if the learner asked you for the answer / to do the thinking and you redirected; otherwise false.

Score only the learner's most recent message. The source and earlier turns are context for judging it.`;

export const COACH_SCHEMA = {
  type: "object",
  properties: {
    coachReply: {
      type: "string",
      description: "2-4 sentences, ending on a question. Never contains the answer.",
    },
    refusedToAnswer: {
      type: "boolean",
      description: "True only if the learner asked for the answer and you redirected.",
    },
    scores: {
      type: "object",
      properties: {
        curiosity: { type: "integer", description: "0-5" },
        specificity: { type: "integer", description: "0-5" },
        assumptions: { type: "integer", description: "0-5" },
        evidence: { type: "integer", description: "0-5" },
      },
      required: ["curiosity", "specificity", "assumptions", "evidence"],
      additionalProperties: false,
    },
    observation: { type: "string", description: "One honest sentence about this move." },
    nextNudge: { type: "string", description: "One sharper question they could ask next." },
  },
  required: ["coachReply", "refusedToAnswer", "scores", "observation", "nextNudge"],
  additionalProperties: false,
} as const;

export type SourceType = "claim" | "text" | "question" | "phenomenon";

// Appended for the local (small open-weight) model, which has no server-side
// schema enforcement. The cloud path uses output_config.format instead.
export const JSON_INSTRUCTION = `Respond with ONLY a single JSON object, no markdown, no prose around it, with exactly these keys:
{
  "coachReply": string (2-4 sentences ending on a question, never the answer),
  "refusedToAnswer": boolean,
  "scores": { "curiosity": 0-5, "specificity": 0-5, "assumptions": 0-5, "evidence": 0-5 },
  "observation": string,
  "nextNudge": string
}`;

export function buildSourceBlock(source: string, sourceType: SourceType): string {
  const framing: Record<SourceType, string> = {
    claim: "Here is a claim I want to think critically about",
    text: "Here is a piece of text I want to interrogate",
    question: "Here is a question I am trying to think through",
    phenomenon: "Here is a real-world phenomenon I want to understand",
  };
  return `${framing[sourceType]}:\n\n"""\n${source}\n"""\n\nCoach me through it. Do not give me the answer.`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Shared by both engines so the cloud and local coach see an identical conversation.
export function buildMessages(
  source: string,
  sourceType: SourceType,
  history: { role: "learner" | "coach"; text: string }[],
  latest: string,
): ChatMessage[] {
  return [
    { role: "user", content: buildSourceBlock(source, sourceType) },
    ...history.map(
      (t): ChatMessage => ({
        role: t.role === "learner" ? "user" : "assistant",
        content: t.text,
      }),
    ),
    { role: "user", content: latest },
  ];
}

// Tolerant parse for the local model's JSON. Clamps scores and fills gaps so a
// slightly malformed small-model response still renders instead of crashing.
export function parseCoachJSON(raw: string): import("./types").CoachResponse {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

  const obj = JSON.parse(text) as Record<string, unknown>;
  const rawScores = (obj.scores ?? {}) as Record<string, unknown>;
  const clamp = (v: unknown) => Math.max(0, Math.min(5, Math.round(Number(v) || 0)));

  return {
    coachReply: String(obj.coachReply ?? "").trim() || "Let's keep going. What part of this feels least settled to you?",
    refusedToAnswer: Boolean(obj.refusedToAnswer),
    scores: {
      curiosity: clamp(rawScores.curiosity),
      specificity: clamp(rawScores.specificity),
      assumptions: clamp(rawScores.assumptions),
      evidence: clamp(rawScores.evidence),
    },
    observation: String(obj.observation ?? "").trim(),
    nextNudge: String(obj.nextNudge ?? "").trim(),
  };
}
