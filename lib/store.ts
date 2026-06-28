"use client";

import type { EngineId } from "./engines";
import type { Session } from "./types";

// All learner data lives here: in the browser, under the learner's control.

const SESSION_KEY = "foil.session.v1";
const ENGINE_KEY = "foil.engine.v1";

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function loadEngine(): EngineId | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ENGINE_KEY) as EngineId | null;
}

export function saveEngine(id: EngineId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENGINE_KEY, id);
}

export function newSession(source: string, sourceType: Session["sourceType"]): Session {
  return {
    id: crypto.randomUUID(),
    source,
    sourceType,
    turns: [],
    createdAt: Date.now(),
  };
}
