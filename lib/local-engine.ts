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

// Cache the in-flight load promise (not just the resolved engine) so warming on
// page load and a first question can't start two downloads of the same model.
const enginePromises = new Map<string, Promise<Engine>>();

// Many GPUs/browsers expose WebGPU but not the shader-f16 feature that q4f16
// model builds require. Probe for it so we can pick a build the device can run.
let f16Support: boolean | null = null;
export async function supportsShaderF16(): Promise<boolean> {
  if (f16Support !== null) return f16Support;
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } }).gpu;
    if (!gpu) return (f16Support = false);
    const adapter = await gpu.requestAdapter();
    f16Support = !!adapter && adapter.features.has("shader-f16");
  } catch {
    f16Support = false;
  }
  return f16Support;
}

export function ensureLocalEngine(
  model: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<Engine> {
  const existing = enginePromises.get(model);
  if (existing) return existing;

  const promise = (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    // Store weights in IndexedDB rather than the Cache API. HuggingFace serves
    // shards via redirects, and Cache.add() rejects redirected/opaque responses
    // with "Cache.add() encountered a network error". IndexedDB fetches manually
    // and avoids that, working across far more browsers and networks.
    const appConfig = { ...webllm.prebuiltAppConfig, useIndexedDBCache: true };
    return (await webllm.CreateMLCEngine(model, {
      appConfig,
      initProgressCallback: (r: { text: string; progress: number }) =>
        onProgress?.({ text: r.text, progress: r.progress }),
    })) as unknown as Engine;
  })();

  enginePromises.set(model, promise);
  // On failure, drop the cached promise so a later attempt can retry cleanly.
  promise.catch(() => enginePromises.delete(model));
  return promise;
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

export function isLocalEngineLoading(model: string): boolean {
  return enginePromises.has(model);
}
