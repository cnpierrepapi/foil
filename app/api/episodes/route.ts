import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Episode } from "@/lib/types";

export const runtime = "nodejs";

// Anonymous, device-based persistence. Episodes are keyed by a random device id
// (no account, no email). The table has RLS on with no policies; all access goes
// through SECURITY DEFINER functions, so the publishable key can only insert, or
// read rows for one device id. localStorage stays the client's source of truth;
// this is durable backup + cross-session restore.

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

  const { error } = await db.rpc("save_episode", {
    p_id: ep.id,
    p_device_id: ep.deviceId,
    p_source: ep.source,
    p_source_type: ep.sourceType,
    p_created_at: new Date(ep.createdAt).toISOString(),
    p_exchanges: ep.stats.exchanges,
    p_mastery: ep.stats.mastery,
    p_trait_averages: ep.stats.traitAverages,
    p_strongest: ep.stats.strongest,
    p_weakest: ep.stats.weakest,
    p_turns: ep.turns,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const db = supabaseServer();
  if (!db) return NextResponse.json({ episodes: [] });

  const device = new URL(req.url).searchParams.get("device");
  if (!device) return NextResponse.json({ error: "missing device" }, { status: 400 });

  const { data, error } = await db.rpc("list_episodes_for_device", {
    p_device_id: device,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ episodes: data ?? [] });
}
