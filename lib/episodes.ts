"use client";

import type { Episode } from "./types";

// Anonymous, device-based identity. A random id in localStorage keys this
// device's episodes. No login, no email, no PII.

const DEVICE_KEY = "foil.device.v1";
const EPISODES_KEY = "foil.episodes.v1";

export function deviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function listEpisodes(): Episode[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(EPISODES_KEY) ?? "[]") as Episode[];
  } catch {
    return [];
  }
}

// The most recent saved episode's mastery, for showing change over time.
export function previousMastery(): number | null {
  const all = listEpisodes();
  return all.length ? all[0].stats.mastery : null;
}

export function saveEpisode(ep: Episode): void {
  if (typeof window === "undefined") return;
  const all = listEpisodes();
  all.unshift(ep);
  window.localStorage.setItem(EPISODES_KEY, JSON.stringify(all.slice(0, 200)));
  void syncEpisode(ep);
}

// Best-effort sync to Supabase via our API route. localStorage stays the source
// of truth, so this failing (offline, not yet configured) is harmless.
async function syncEpisode(ep: Episode): Promise<void> {
  try {
    await fetch("/api/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ep),
    });
  } catch {
    /* ignore */
  }
}
