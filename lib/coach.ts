"use client";

import { getEngine, type EngineId } from "./engines";
import { runLocalCoach, type LoadProgress } from "./local-engine";
import type { CoachResponse, Session, Turn } from "./types";

// Single entry point the UI calls. It hides whether the coach is running
// on-device or in the cloud.

function historyFrom(turns: Turn[]) {
  return turns.map((t) => ({ role: t.role, text: t.text }));
}

export async function askCoach(
  engineId: EngineId,
  session: Session,
  latest: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<CoachResponse> {
  const engine = getEngine(engineId);
  const history = historyFrom(session.turns);

  if (engine.kind === "local" && engine.model) {
    return runLocalCoach(
      engine.model,
      session.source,
      session.sourceType,
      history,
      latest,
      onProgress,
    );
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
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "The coach is unavailable.");
  return data as CoachResponse;
}
