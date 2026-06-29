"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Polygon } from "./Polygon";
import { masteryBand } from "@/lib/scoring";
import { downloadReportPng } from "@/lib/report";
import {
  DIMENSION_BLURBS,
  DIMENSION_LABELS,
  type Episode,
} from "@/lib/types";

// Shown when an episode (EPISODE_LENGTH exchanges) completes. A short sequence of
// cards that celebrates the result and, importantly, explains how the Mastery
// number was calculated from the four traits.

export function SkillCards({
  episode,
  prevMastery,
  onNewInquiry,
}: {
  episode: Episode;
  prevMastery: number | null;
  onNewInquiry: () => void;
}) {
  const [i, setI] = useState(0);
  const { stats } = episode;
  const delta = prevMastery == null ? null : Math.round((stats.mastery - prevMastery) * 100) / 100;

  const cards = [
    <Complete key="c" mastery={stats.mastery} />,
    <Shape key="s" episode={episode} />,
    <Traits key="t" episode={episode} />,
    <Calc key="m" episode={episode} delta={delta} />,
    <Actions key="a" episode={episode} onNewInquiry={onNewInquiry} />,
  ];
  const last = i === cards.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/97 px-5 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center">{cards[i]}</div>
      <div className="mb-8 w-full max-w-md">
        <div className="mb-4 flex justify-center gap-1.5">
          {cards.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-accent" : "w-1.5 bg-ink/15"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink/60 disabled:opacity-0"
          >
            Back
          </button>
          {!last ? (
            <button
              onClick={() => setI((n) => n + 1)}
              className="rounded-full bg-accent px-8 py-2.5 text-sm font-semibold text-paper"
            >
              Continue
            </button>
          ) : (
            <span className="w-[68px]" />
          )}
        </div>
      </div>
    </div>
  );
}

function Complete({ mastery }: { mastery: number }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setShown(1 + (mastery - 1) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mastery]);
  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">Episode complete</p>
      <p className="mt-6 font-serif text-7xl tabular-nums text-ink">{shown.toFixed(2)}</p>
      <p className="mt-3 text-lg text-ink/70">{masteryBand(mastery)}</p>
      <p className="mt-1 text-sm text-ink/45">Mastery, on a scale of 1.00 to 4.99</p>
    </div>
  );
}

function Shape({ episode }: { episode: Episode }) {
  return (
    <div className="text-center">
      <h2 className="font-serif text-2xl">Your reasoning shape</h2>
      <p className="mt-1 text-sm text-ink/55">How your questions scored across the four traits.</p>
      <div className="mt-4 flex justify-center">
        <Polygon scores={episode.stats.traitAverages} size={260} />
      </div>
    </div>
  );
}

function Traits({ episode }: { episode: Episode }) {
  const { strongest, weakest } = episode.stats;
  return (
    <div className="w-full">
      <h2 className="text-center font-serif text-2xl">What stood out</h2>
      <div className="mt-6 space-y-3">
        <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Sharpest</p>
          <p className="mt-0.5 font-serif text-lg text-ink">{DIMENSION_LABELS[strongest]}</p>
          <p className="mt-0.5 text-sm text-ink/60">{DIMENSION_BLURBS[strongest]}</p>
        </div>
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Grow next</p>
          <p className="mt-0.5 font-serif text-lg text-ink">{DIMENSION_LABELS[weakest]}</p>
          <p className="mt-0.5 text-sm text-ink/60">{DIMENSION_BLURBS[weakest]}</p>
        </div>
      </div>
    </div>
  );
}

function Calc({ episode, delta }: { episode: Episode; delta: number | null }) {
  const avg = episode.stats.traitAverages;
  const mean =
    (avg.curiosity + avg.specificity + avg.assumptions + avg.evidence) / 4;
  return (
    <div className="w-full">
      <h2 className="text-center font-serif text-2xl">How it&rsquo;s calculated</h2>
      <p className="mt-2 text-center text-sm text-ink/60">
        Every question you asked was scored 0 to 5 on each trait. We average those,
        then map the result onto the 1.00 to 4.99 Mastery scale.
      </p>
      <div className="mt-5 rounded-2xl border border-ink/10 bg-card p-4 text-sm">
        <div className="flex items-center justify-between text-ink/70">
          <span>Average across traits</span>
          <span className="font-mono">{mean.toFixed(2)} / 5</span>
        </div>
        <div className="my-2 h-px bg-ink/10" />
        <div className="flex items-center justify-between">
          <span className="font-medium">Mastery</span>
          <span className="font-mono text-accent">{episode.stats.mastery.toFixed(2)}</span>
        </div>
        {delta != null && (
          <p className="mt-2 text-xs text-ink/55">
            {delta === 0
              ? "No change vs your last episode."
              : `${delta > 0 ? "▲ +" : "▼ "}${delta.toFixed(2)} vs your last episode.`}
          </p>
        )}
      </div>
    </div>
  );
}

function Actions({
  episode,
  onNewInquiry,
}: {
  episode: Episode;
  onNewInquiry: () => void;
}) {
  return (
    <div className="w-full text-center">
      <h2 className="font-serif text-2xl">Keep your progress</h2>
      <p className="mt-1 text-sm text-ink/55">Download your report card or see how you&rsquo;re trending.</p>
      <div className="mt-6 space-y-2.5">
        <button
          onClick={() => downloadReportPng(episode)}
          className="block w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-paper"
        >
          Download report card
        </button>
        <Link
          href="/profile"
          className="block w-full rounded-full border border-ink/20 px-5 py-3 text-sm font-medium hover:bg-ink/5"
        >
          View your profile
        </Link>
        <button
          onClick={onNewInquiry}
          className="block w-full rounded-full px-5 py-3 text-sm font-medium text-ink/60 hover:bg-ink/5"
        >
          Start a new inquiry
        </button>
      </div>
    </div>
  );
}
