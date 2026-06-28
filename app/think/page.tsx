"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Rubric } from "@/components/Rubric";
import { Spark } from "@/components/Spark";
import { askCoach } from "@/lib/coach";
import { ENGINES, getEngine, webgpuAvailable, type EngineId } from "@/lib/engines";
import {
  clearSession,
  loadEngine,
  loadSession,
  newSession,
  saveEngine,
  saveSession,
} from "@/lib/store";
import { STARTERS } from "@/lib/starters";
import { DIMENSIONS, type Scores, type Session, type SourceType } from "@/lib/types";
import type { LoadProgress } from "@/lib/local-engine";

const SOURCE_TYPES: { id: SourceType; label: string }[] = [
  { id: "claim", label: "A claim" },
  { id: "question", label: "A question" },
  { id: "text", label: "An argument" },
  { id: "phenomenon", label: "A phenomenon" },
];

function total(scores: Scores) {
  return DIMENSIONS.reduce((s, d) => s + scores[d], 0);
}

export default function ThinkPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [engineId, setEngineId] = useState<EngineId>("local-1_5b");
  const [draftType, setDraftType] = useState<SourceType>("claim");
  const [draftSource, setDraftSource] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore local state and pick a sensible default engine for this device.
  useEffect(() => {
    const saved = loadSession();
    if (saved) setSession(saved);
    const savedEngine = loadEngine();
    if (savedEngine) setEngineId(savedEngine);
    else if (!webgpuAvailable()) setEngineId("cloud");
    setReady(true);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.turns.length, busy]);

  function chooseEngine(id: EngineId) {
    setEngineId(id);
    saveEngine(id);
  }

  function begin() {
    if (!draftSource.trim()) return;
    const s = newSession(draftSource.trim(), draftType);
    setSession(s);
    saveSession(s);
    setError(null);
  }

  function reset() {
    clearSession();
    setSession(null);
    setDraftSource("");
    setInput("");
    setError(null);
  }

  async function send() {
    if (!session || !input.trim() || busy) return;
    const latest = input.trim();
    const base = session;
    setInput("");
    setError(null);
    setSession({ ...base, turns: [...base.turns, { role: "learner", text: latest }] });
    setBusy(true);
    try {
      const resp = await askCoach(engineId, base, latest, setProgress);
      setSession((cur) => {
        if (!cur) return cur;
        const next: Session = {
          ...cur,
          turns: [
            ...cur.turns,
            {
              role: "coach",
              text: resp.coachReply,
              scores: resp.scores,
              observation: resp.observation,
              nextNudge: resp.nextNudge,
            },
          ],
        };
        saveSession(next);
        return next;
      });
    } catch (e) {
      // Roll back the optimistic turn so the learner can retry cleanly.
      setSession(base);
      setInput(latest);
      setError(e instanceof Error ? e.message : "The coach is unavailable.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper">
        <span className="font-serif text-2xl tracking-tight text-ink/40">Foil</span>
      </div>
    );
  }

  const engine = getEngine(engineId);
  const totals = session
    ? session.turns.filter((t) => t.role === "coach").map((t) => total((t as { scores: Scores }).scores))
    : [];

  return (
    <div className="flex min-h-full flex-col bg-paper text-ink">
      <header className="flex items-center justify-between border-b border-ink/10 px-5 py-3.5 sm:px-8">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Foil
        </Link>
        <div className="flex items-center gap-3">
          <EngineBadge engineId={engineId} onChange={chooseEngine} />
          {session && (
            <button
              onClick={reset}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
            >
              New inquiry
            </button>
          )}
        </div>
      </header>

      {!session ? (
        <Setup
          draftType={draftType}
          setDraftType={setDraftType}
          draftSource={draftSource}
          setDraftSource={setDraftSource}
          onBegin={begin}
        />
      ) : (
        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-px lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* The source under inquiry */}
          <aside className="border-b border-ink/10 px-5 py-7 sm:px-8 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-widest text-ink/40">
              {SOURCE_TYPES.find((t) => t.id === session.sourceType)?.label ?? "Source"}
            </p>
            <blockquote className="font-serif text-2xl leading-snug">{session.source}</blockquote>
            <p className="mt-6 text-sm leading-relaxed text-ink/55">
              Foil will not answer this for you. It will ask the next question that
              moves your own thinking forward, and show you how sharp each question is.
            </p>
          </aside>

          {/* The dialogue */}
          <section className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-2.5 sm:px-8">
              <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-ink/40">
                Your inquiry
              </span>
              <Spark totals={totals} />
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-7 sm:px-8">
              {session.turns.length === 0 && (
                <p className="max-w-md font-serif text-lg leading-relaxed text-ink/50">
                  Ask your first question about it. Not &ldquo;what&rsquo;s the answer&rdquo; &mdash;
                  ask what you would need to know to figure it out yourself.
                </p>
              )}

              {session.turns.map((t, i) =>
                t.role === "learner" ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[0.95rem] leading-relaxed text-paper">
                      {t.text}
                    </p>
                  </div>
                ) : (
                  <div key={i} className="max-w-[92%] space-y-3">
                    <p className="font-serif text-lg leading-relaxed">{t.text}</p>
                    {(t.observation || t.nextNudge) && (
                      <div className="space-y-1.5 border-l-2 border-accent/40 pl-3.5 text-sm">
                        {t.observation && <p className="italic text-ink/60">{t.observation}</p>}
                        {t.nextNudge && (
                          <p className="text-ink/70">
                            <span className="font-medium text-ink/50">Try asking: </span>
                            {t.nextNudge}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="rounded-xl border border-ink/10 bg-card px-4 py-3">
                      <Rubric scores={t.scores} />
                    </div>
                  </div>
                ),
              )}

              {busy && (
                <div className="space-y-2 text-sm text-ink/50">
                  <p className="font-serif text-lg italic">
                    {progress ? "Loading the on-device coach…" : "Thinking…"}
                  </p>
                  {progress && (
                    <div className="max-w-sm">
                      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${Math.round(progress.progress * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1.5 truncate text-xs text-ink/45">{progress.text}</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                  {error}
                </p>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-ink/10 px-5 py-3.5 sm:px-8">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Ask a question, or reason out loud…"
                  className="max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-ink/15 bg-paper px-3.5 py-2.5 text-[0.95rem] leading-relaxed outline-none focus:border-ink/40"
                />
                <button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-paper transition-opacity disabled:opacity-40"
                >
                  Ask
                </button>
              </div>
              <p className="mt-2 text-[0.7rem] text-ink/40">
                {engine.kind === "local"
                  ? "Running on your device. Your questions never leave it."
                  : "Running on Claude. Your questions are sent to the model and not stored."}
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

function Setup({
  draftType,
  setDraftType,
  draftSource,
  setDraftSource,
  onBegin,
}: {
  draftType: SourceType;
  setDraftType: (t: SourceType) => void;
  draftSource: string;
  setDraftSource: (s: string) => void;
  onBegin: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12 sm:px-8">
      <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
        What do you want to think through?
      </h1>
      <p className="mt-3 text-ink/60">
        Bring a claim, a question, an argument, or something in the world you don&rsquo;t
        yet understand. You&rsquo;ll do the thinking. Foil just won&rsquo;t let you off easy.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        {SOURCE_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setDraftType(t.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              draftType === t.id
                ? "border-ink bg-ink text-paper"
                : "border-ink/20 hover:bg-ink/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={draftSource}
        onChange={(e) => setDraftSource(e.target.value)}
        rows={4}
        placeholder="Paste or type it here…"
        className="mt-4 w-full resize-none rounded-2xl border border-ink/15 bg-card px-4 py-3.5 text-[1.05rem] leading-relaxed outline-none focus:border-ink/40"
      />

      <button
        onClick={onBegin}
        disabled={!draftSource.trim()}
        className="mt-3 rounded-full bg-accent px-6 py-2.5 font-semibold text-paper transition-opacity disabled:opacity-40"
      >
        Begin
      </button>

      <p className="mt-10 mb-3 text-[0.7rem] font-semibold uppercase tracking-widest text-ink/40">
        Or start with one of these
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setDraftType(s.type);
              setDraftSource(s.source);
            }}
            className="rounded-xl border border-ink/12 bg-card px-4 py-3 text-left transition-colors hover:border-ink/30"
          >
            <span className="block text-sm font-medium">{s.label}</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink/55">{s.source}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

function EngineBadge({
  engineId,
  onChange,
}: {
  engineId: EngineId;
  onChange: (id: EngineId) => void;
}) {
  const [open, setOpen] = useState(false);
  const engine = getEngine(engineId);
  const hasGpu = webgpuAvailable();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            engine.kind === "local" ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        {engine.kind === "local" ? "On-device" : "Cloud"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-ink/15 bg-paper p-1.5 shadow-lg">
          {ENGINES.map((e) => {
            const disabled = e.kind === "local" && !hasGpu;
            return (
              <button
                key={e.id}
                disabled={disabled}
                onClick={() => {
                  onChange(e.id);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  engineId === e.id ? "bg-ink/5" : "hover:bg-ink/5"
                } ${disabled ? "opacity-40" : ""}`}
              >
                <span className="flex items-center justify-between text-sm font-medium">
                  {e.label}
                  <span className="text-[0.7rem] font-normal text-ink/45">{e.size}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-ink/55">
                  {disabled ? "Needs a browser with WebGPU." : e.blurb}
                </span>
              </button>
            );
          })}
          <p className="px-3 py-2 text-[0.7rem] leading-snug text-ink/45">
            On-device keeps every question private to your machine. Cloud uses Claude
            when your device can&rsquo;t run a model.
          </p>
        </div>
      )}
    </div>
  );
}
