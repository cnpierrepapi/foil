import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  COACH_MODEL,
  COACH_SCHEMA,
  REFUSAL_RESPONSE,
  SYSTEM_PROMPT,
  buildMessages,
  decodeUnicodeEscapes,
  type SourceType,
} from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

// The server is a thin, stateless proxy to the model. It stores nothing:
// no transcripts, no accounts, no logging of inquiry content. Privacy by design.

interface CoachRequest {
  source: string;
  sourceType: SourceType;
  history: { role: "learner" | "coach"; text: string }[];
  latest: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The coach is not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { source, sourceType, history, latest } = body;
  if (!source?.trim() || !latest?.trim()) {
    return NextResponse.json({ error: "Missing source or message." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = buildMessages(
    source,
    sourceType,
    history,
    latest,
  );

  const call = (maxTokens: number) =>
    client.messages.create({
      model: COACH_MODEL,
      max_tokens: maxTokens,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: COACH_SCHEMA },
      },
      messages,
    });

  try {
    let response = await call(1500);

    // A reply plus four scores is short; hitting the cap means the model
    // rambled. Retry once with more room before giving up.
    if (response.stop_reason === "max_tokens") {
      response = await call(2500);
    }

    // Structured output is only guaranteed on a normal stop. On a safety
    // refusal the text may not match the schema, so return a clean, fixed
    // coach turn instead of risking malformed JSON reaching the learner.
    if (response.stop_reason === "refusal") {
      return NextResponse.json(REFUSAL_RESPONSE);
    }
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "The coach could not finish a reply. Please try again." },
        { status: 502 },
      );
    }

    // With output_config.format and a normal stop, the text block is valid JSON.
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      throw new Error("No structured output returned.");
    }
    const parsed = JSON.parse(text.text) as Record<string, unknown>;
    for (const k of ["coachReply", "observation"] as const) {
      if (typeof parsed[k] === "string") parsed[k] = decodeUnicodeEscapes(parsed[k] as string);
    }
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "The coach is unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
