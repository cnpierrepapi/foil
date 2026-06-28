// In-browser inference via WebLLM (MLC) over WebGPU. The model weights download
// once, then every request runs locally. Client-only: imported dynamically.

import {
  COMPACT_SYSTEM_PROMPT,
  buildMessages,
  parseCoachJSON,
  type SourceType,
} from "./prompt";
import type { CoachResponse } from "./types";

// Models whose weights we mirror to our own CDN (Vercel Blob) for a fast,
// reliable download instead of HuggingFace. Maps the WebLLM model id to the
// base URL of its weight files.
const HOSTED_WEIGHTS: Record<string, string> = {
  "Qwen2.5-0.5B-Instruct-q4f32_1-MLC":
    "https://xzy3jzk0o1duizag.public.blob.vercel-storage.com/Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
};

export interface LoadProgress {
  text: string;
  progress: number; // 0..1
}

// One engine instance per model id, reused across requests.
type ChatChunk = {
  choices: { delta?: { content?: string | null }; message?: { content?: string | null } }[];
};
type Engine = {
  chat: {
    completions: {
      create: (args: unknown) => Promise<unknown>;
    };
  };
  interruptGenerate?: () => void;
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
    // Use the IndexedDB cache backend instead of the default Cache API.
    // HuggingFace serves weight shards via redirects, and the Cache API rejects
    // redirected/opaque responses with "Cache.add() encountered a network
    // error" (and stalls retrying them). IndexedDB fetches each shard plainly
    // and stores the bytes, which is far more reliable across browsers/networks.
    const appConfig = {
      ...webllm.prebuiltAppConfig,
      cacheBackend: "indexeddb" as const,
    };
    // Point a mirrored model at our CDN instead of HuggingFace.
    const hosted = HOSTED_WEIGHTS[model];
    if (hosted) {
      appConfig.model_list = appConfig.model_list.map((r) =>
        r.model_id === model ? { ...r, model: hosted } : r,
      );
    }
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

// Hard ceiling so a slow or runaway generation can't hang forever. On a slow
// integrated GPU the f32 build does a few tokens/sec, so this allows a complete
// answer while still bounding the worst case; on timeout we interrupt and let
// the caller fall back to the cloud coach.
const LOCAL_TIMEOUT_MS = 90000;

export async function runLocalCoach(
  model: string,
  source: string,
  sourceType: SourceType,
  history: { role: "learner" | "coach"; text: string }[],
  latest: string,
  onProgress?: (p: LoadProgress) => void,
  onToken?: (count: number) => void,
): Promise<CoachResponse> {
  const engine = await ensureLocalEngine(model, onProgress);
  const messages = [
    { role: "system", content: COMPACT_SYSTEM_PROMPT },
    ...buildMessages(source, sourceType, history, latest),
  ];

  // Stream so the UI can show that the model is actively generating. No
  // response_format grammar here: it slows decoding on a small model, and the
  // tolerant parser handles plain JSON the model returns.
  const stream = (await engine.chat.completions.create({
    messages,
    temperature: 0.6,
    max_tokens: 400,
    stream: true,
  })) as AsyncIterable<ChatChunk>;

  let content = "";
  let count = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    engine.interruptGenerate?.();
  }, LOCAL_TIMEOUT_MS);

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        content += delta;
        count += 1;
        onToken?.(count);
      }
    }
  } finally {
    clearTimeout(timer);
  }

  if (timedOut) {
    throw new Error(
      "On-device generation timed out. This device is likely too slow for the local model.",
    );
  }
  return parseCoachJSON(content);
}

export function isLocalEngineLoading(model: string): boolean {
  return enginePromises.has(model);
}
