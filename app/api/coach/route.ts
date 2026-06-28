import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  COACH_MODEL,
  COACH_SCHEMA,
  SYSTEM_PROMPT,
  buildMessages,
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

  try {
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: COACH_SCHEMA },
      },
      messages,
    });

    // With output_config.format, the text block is guaranteed valid JSON.
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      throw new Error("No structured output returned.");
    }
    return NextResponse.json(JSON.parse(text.text));
  } catch (err) {
    const message = err instanceof Error ? err.message : "The coach is unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
