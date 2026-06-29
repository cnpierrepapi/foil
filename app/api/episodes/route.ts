import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Episode } from "@/lib/types";

export const runtime = "nodejs";

// Anonymous, device-based persistence. Episodes are keyed by a random device id
// (no account, no email). RLS is on with no public policies, so only this
// server (service role) can read or write. localStorage remains the client's
// source of truth; this is durable backup + cross-session restore.

export async function POST(req: Request) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ ok: false, reason: "not configured" });

  let ep: Episode;
  try {
    ep = (await req.json()) as Episode;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!ep?.id || !ep?.deviceId) {
    return NextResponse.json({ error: "missing id or deviceId" }, { status: 400 });
  }

  const { error } = await db.from("episodes").upsert({
    id: ep.id,
    device_id: ep.deviceId,
    source: ep.source,
    source_type: ep.sourceType,
    created_at: new Date(ep.createdAt).toISOString(),
    exchanges: ep.stats.exchanges,
    mastery: ep.stats.mastery,
    trait_averages: ep.stats.traitAverages,
    strongest: ep.stats.strongest,
    weakest: ep.stats.weakest,
    turns: ep.turns,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ episodes: [] });

  const device = new URL(req.url).searchParams.get("device");
  if (!device) return NextResponse.json({ error: "missing device" }, { status: 400 });

  const { data, error } = await db
    .from("episodes")
    .select("*")
    .eq("device_id", device)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ episodes: data ?? [] });
}
