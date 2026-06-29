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

// Shape of a row returned by GET /api/episodes (Supabase column names).
interface EpisodeRow {
  id: string;
  device_id: string;
  source: string;
  source_type: string;
  created_at: string;
  exchanges: number;
  mastery: number | string;
  trait_averages: Episode["stats"]["traitAverages"];
  strongest: string;
  weakest: string;
  turns: Episode["turns"] | null;
}

function rowToEpisode(r: EpisodeRow): Episode {
  return {
    id: r.id,
    deviceId: r.device_id,
    source: r.source,
    sourceType: r.source_type as Episode["sourceType"],
    createdAt: new Date(r.created_at).getTime(),
    turns: r.turns ?? [],
    stats: {
      exchanges: r.exchanges,
      traitAverages: r.trait_averages,
      mastery: Number(r.mastery),
      strongest: r.strongest as Episode["stats"]["strongest"],
      weakest: r.weakest as Episode["stats"]["weakest"],
    },
  };
}

// Pull this device's episodes back from Supabase (durable restore).
export async function fetchCloudEpisodes(): Promise<Episode[]> {
  const id = deviceId();
  if (!id) return [];
  try {
    const res = await fetch(`/api/episodes?device=${encodeURIComponent(id)}`);
    if (!res.ok) return [];
    const { episodes } = (await res.json()) as { episodes: EpisodeRow[] };
    return (episodes ?? []).map(rowToEpisode);
  } catch {
    return [];
  }
}

export function mergeEpisodes(a: Episode[], b: Episode[]): Episode[] {
  const map = new Map<string, Episode>();
  for (const e of [...a, ...b]) map.set(e.id, e);
  return [...map.values()].sort((x, y) => y.createdAt - x.createdAt);
}

export function persistEpisodes(eps: Episode[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EPISODES_KEY, JSON.stringify(eps.slice(0, 200)));
}
