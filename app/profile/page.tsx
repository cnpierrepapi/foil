"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Polygon } from "@/components/Polygon";
import { listEpisodes } from "@/lib/episodes";
import { masteryBand } from "@/lib/scoring";
import { downloadReportPng } from "@/lib/report";
import { DIMENSION_LABELS, type Episode } from "@/lib/types";

export default function ProfilePage() {
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);

  useEffect(() => {
    setEpisodes(listEpisodes());
  }, []);

  if (episodes === null) return null;
  const latest = episodes[0] ?? null;

  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Foil
        </Link>
        <Link
          href="/think"
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-paper"
        >
          New inquiry
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-serif text-3xl">Your profile</h1>
        <p className="mt-1 text-sm text-ink/55">
          Private to this device. Nothing here is tied to your name or email.
        </p>

        {episodes.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-ink/10 bg-card p-8 text-center">
            <p className="font-serif text-xl">No episodes yet</p>
            <p className="mt-2 text-sm text-ink/60">
              Finish an inquiry of 14 exchanges to earn your first Mastery score.
            </p>
            <Link
              href="/think"
              className="mt-5 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-paper"
            >
              Start thinking
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-[auto_1fr]">
              <div className="rounded-2xl border border-ink/10 bg-card p-5 text-center sm:w-48">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Latest mastery</p>
                <p className="mt-2 font-serif text-5xl tabular-nums text-accent">
                  {latest.stats.mastery.toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-ink/60">{masteryBand(latest.stats.mastery)}</p>
                <p className="mt-3 text-xs text-ink/45">{episodes.length} episode{episodes.length > 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-card p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/40">
                  Mastery over time
                </p>
                <Trend episodes={episodes} />
              </div>
            </section>

            <h2 className="mt-9 mb-3 text-xs font-semibold uppercase tracking-widest text-ink/40">
              Episodes
            </h2>
            <div className="space-y-3">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-card p-4"
                >
                  <div className="shrink-0">
                    <Polygon scores={ep.stats.traitAverages} size={92} showValues={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base">{ep.source}</p>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {new Date(ep.createdAt).toLocaleDateString()} · Sharpest{" "}
                      {DIMENSION_LABELS[ep.stats.strongest]} · Grow {DIMENSION_LABELS[ep.stats.weakest]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-serif text-2xl tabular-nums text-accent">
                      {ep.stats.mastery.toFixed(2)}
                    </p>
                    <button
                      onClick={() => downloadReportPng(ep)}
                      className="mt-1 text-xs font-medium text-ink/55 underline hover:text-ink"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Trend({ episodes }: { episodes: Episode[] }) {
  const series = [...episodes].reverse().map((e) => e.stats.mastery);
  if (series.length < 2) {
    return <p className="text-sm text-ink/50">Finish another episode to see a trend.</p>;
  }
  const w = 320;
  const h = 64;
  const pad = 6;
  const min = 1;
  const max = 4.99;
  const step = (w - pad * 2) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" />
      <circle cx={last[0]} cy={last[1]} r="3" className="fill-accent" />
    </svg>
  );
}
