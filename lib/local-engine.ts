// In-browser inference via WebLLM (MLC) over WebGPU. The model weights download
// once, then every request runs locally. Client-only: imported dynamically.

import {
  SYSTEM_PROMPT,
  JSON_INSTRUCTION,
  buildMessages,
  parseCoachJSON,
  type SourceType,
} from "./prompt";
import type { CoachResponse } from "./types";

export interface LoadProgress {
  text: string;
  progress: number; // 0..1
}

// One engine instance per model id, reused across requests.
type Engine = {
  chat: {
    completions: {
      create: (args: unknown) => Promise<{
        choices: { message: { content: string | null } }[];
      }>;
    };
  };
};

const engines = new Map<string, Engine>();

export async function ensureLocalEngine(
  model: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<Engine> {
  const existing = engines.get(model);
  if (existing) return existing;

  const webllm = await import("@mlc-ai/web-llm");
  const engine = (await webllm.CreateMLCEngine(model, {
    initProgressCallback: (r: { text: string; progress: number }) =>
      onProgress?.({ text: r.text, progress: r.progress }),
  })) as unknown as Engine;

  engines.set(model, engine);
  return engine;
}

export async function runLocalCoach(
  model: string,
  source: string,
  sourceType: SourceType,
  history: { role: "learner" | "coach"; text: string }[],
  latest: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<CoachResponse> {
  const engine = await ensureLocalEngine(model, onProgress);
  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTION}` },
    ...buildMessages(source, sourceType, history, latest),
  ];

  const completion = await engine.chat.completions.create({
    messages,
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 700,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  return parseCoachJSON(text);
}

export function isLocalEngineLoaded(model: string): boolean {
  return engines.has(model);
}
