"use client";

import { getEngine, type EngineDef, type EngineId } from "./engines";
import { runLocalCoach, supportsShaderF16, type LoadProgress } from "./local-engine";
import type { CoachResponse, Session, Turn } from "./types";

// Single entry point the UI calls. It hides whether the coach is running
// on-device or in the cloud.

function historyFrom(turns: Turn[]) {
  return turns.map((t) => ({ role: t.role, text: t.text }));
}

// Pick the model build this device can run: f16 when the GPU supports it
// (smaller, faster), else the universally-compatible f32 build.
export async function resolveLocalModel(engine: EngineDef): Promise<string> {
  const f16 = await supportsShaderF16();
  return f16 ? engine.model! : engine.modelF32 ?? engine.model!;
}

export async function askCoach(
  engineId: EngineId,
  session: Session,
  latest: string,
  onProgress?: (p: LoadProgress) => void,
  onToken?: (count: number) => void,
): Promise<CoachResponse> {
  const engine = getEngine(engineId);
  const history = historyFrom(session.turns);

  if (engine.kind === "local" && engine.model) {
    const model = await resolveLocalModel(engine);
    try {
      return await runLocalCoach(
        model,
        session.source,
        session.sourceType,
        history,
        latest,
        onProgress,
        onToken,
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : "unknown error";
      throw new Error(
        `Could not run the on-device model (${detail}). Try the Cloud engine from the menu at the top right.`,
      );
    }
  }

  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: session.source,
      sourceType: session.sourceType,
      history,
      latest,
    }),
  });
  // Read the body as text first. A platform-level failure (function timeout,
  // crash, 413) returns a non-JSON error page, and calling res.json() on that
  // throws "Unexpected token ... is not valid JSON" before we can read the
  // status. Parse defensively and surface the real server message instead.
  const raw = await res.text();
  let data: CoachResponse & { error?: string };
  try {
    data = raw ? JSON.parse(raw) : ({} as typeof data);
  } catch {
    const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(
      `The coach is unavailable (HTTP ${res.status})${snippet ? `: ${snippet}` : "."}`,
    );
  }
  if (!res.ok) throw new Error(data?.error ?? "The coach is unavailable.");
  return data as CoachResponse;
}
