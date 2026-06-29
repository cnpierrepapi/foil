"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Rubric } from "@/components/Rubric";
import { Spark } from "@/components/Spark";
import { Gears } from "@/components/Gears";
import { SkillCards } from "@/components/SkillCards";
import { askCoach, resolveLocalModel } from "@/lib/coach";
import { ENGINES, getEngine, isEngineId, webgpuAvailable, type EngineId } from "@/lib/engines";
import { ensureLocalEngine } from "@/lib/local-engine";
import {
  clearSession,
  loadEngine,
  loadSession,
  newSession,
  saveEngine,
  saveSession,
} from "@/lib/store";
import { EPISODE_LENGTH, episodeStats, exchangeCount } from "@/lib/scoring";
import { deviceId, previousMastery, saveEpisode } from "@/lib/episodes";
import { STARTERS } from "@/lib/starters";
import { DIMENSIONS, type Episode, type Scores, type Session, type SourceType } from "@/lib/types";
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
  const [engineId, setEngineId] = useState<EngineId>("cloud");
  const [completed, setCompleted] = useState<Episode | null>(null);
  const [prevMastery, setPrevMastery] = useState<number | null>(null);
  const [draftType, setDraftType] = useState<SourceType>("claim");
  const [draftSource, setDraftSource] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [genTokens, setGenTokens] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [localState, setLocalState] = useState<
    "idle" | "loading" | "ready" | "unsupported" | "error"
  >("idle");
  const [localProgress, setLocalProgress] = useState(0);
  const [localText, setLocalText] = useState("");
  const [localLog, setLocalLog] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [lastLocalError, setLastLocalError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore local state and pick a sensible default engine for this device.
  useEffect(() => {
    const saved = loadSession();
    if (saved) setSession(saved);
    const savedEngine = loadEngine();
    if (isEngineId(savedEngine)) setEngineId(savedEngine);
    setReady(true);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.turns.length, busy]);

  // Tick a seconds counter while a request is in flight, so the user sees the
  // model is alive during prefill (before the first token streams).
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  // Warm the on-device model the moment the page is ready, so the first
  // question is instant and we learn up front whether we must fall back.
  useEffect(() => {
    if (!ready) return;
    const eng = getEngine(engineId);
    if (eng.kind !== "local") {
      setLocalState("idle");
      return;
    }
    setFallback(false);
    setLocalError(null);
    if (!webgpuAvailable()) {
      setLocalState("unsupported");
      setLocalLog((l) => [...l, "WebGPU is not available in this browser."]);
      return;
    }
    let cancelled = false;
    setLocalState("loading");
    setLocalProgress(0);
    (async () => {
      try {
        const model = await resolveLocalModel(eng);
        setLocalLog((l) => [...l, `Selected model build: ${model}`]);
        await ensureLocalEngine(model, (p) => {
          if (cancelled) return;
          setLocalProgress(p.progress);
          setLocalText(p.text);
          setLocalLog((l) =>
            l.length && l[l.length - 1] === p.text ? l : [...l, p.text],
          );
        });
        if (!cancelled) {
          setLocalState("ready");
          setLocalLog((l) => [...l, "Model ready. Running on your device."]);
        }
      } catch (e) {
        if (cancelled) return;
        const detail = e instanceof Error ? e.stack || e.message : String(e);
        setLocalError(detail);
        setLocalLog((l) => [...l, `ERROR: ${detail}`]);
        setLocalState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, engineId, loadAttempt]);

  function retryLocal() {
    setLocalError(null);
    setLocalState("idle");
    setLoadAttempt((n) => n + 1);
  }

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(localLog.join("\n"));
    } catch {
      /* clipboard blocked; the log is still visible to select manually */
    }
  }

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
    setCompleted(null);
  }

  function reset() {
    clearSession();
    setSession(null);
    setDraftSource("");
    setInput("");
    setError(null);
    setCompleted(null);
  }

  async function send() {
    if (!session || !input.trim() || busy) return;
    const latest = input.trim();
    const base = session;
    setInput("");
    setError(null);
    setSession({ ...base, turns: [...base.turns, { role: "learner", text: latest }] });
    setGenTokens(0);
    setBusy(true);
    try {
      let resp;
      try {
        resp = await askCoach(engineId, base, latest, setProgress, setGenTokens);
      } catch (primaryErr) {
        // On-device couldn't run here: capture why, then fall back to cloud.
        if (getEngine(engineId).kind === "local") {
          setFallback(true);
          setLastLocalError(
            primaryErr instanceof Error
              ? primaryErr.stack || primaryErr.message
              : String(primaryErr),
          );
          resp = await askCoach("cloud", base, latest);
        } else {
          throw primaryErr;
        }
      }
      const next: Session = {
        ...base,
        turns: [
          ...base.turns,
          { role: "learner", text: latest },
          {
            role: "coach",
            text: resp.coachReply,
            scores: resp.scores,
            observation: resp.observation,
            nextNudge: resp.nextNudge,
          },
        ],
      };
      setSession(next);
      saveSession(next);
      // An episode ends after EPISODE_LENGTH exchanges: save it and show the
      // skill cards. `===` so it fires exactly once.
      if (exchangeCount(next.turns) === EPISODE_LENGTH) {
        const prev = previousMastery();
        const episode: Episode = {
          id: crypto.randomUUID(),
          deviceId: deviceId(),
          source: next.source,
          sourceType: next.sourceType,
          createdAt: Date.now(),
          turns: next.turns,
          stats: episodeStats(next.turns),
        };
        saveEpisode(episode);
        setPrevMastery(prev);
        setCompleted(episode);
      }
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
      {getEngine(engineId).kind === "local" &&
        (localState === "loading" || localState === "error") && (
          <LoadingScreen
            failed={localState === "error"}
            progress={localProgress}
            text={localText}
            log={localLog}
            error={localError}
            onCopy={copyLog}
            onRetry={retryLocal}
            onUseCloud={() => chooseEngine("cloud")}
          />
        )}
      {completed && (
        <SkillCards episode={completed} prevMastery={prevMastery} onNewInquiry={reset} />
      )}
      <header className="flex items-center justify-between border-b border-ink/10 px-5 py-3.5 sm:px-8">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Foil
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="text-xs font-medium text-ink/55 hover:text-ink">
            Profile
          </Link>
          <EngineBadge
            engineId={engineId}
            onChange={chooseEngine}
            localState={localState}
            localProgress={localProgress}
            fallback={fallback}
          />
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

      {getEngine(engineId).kind === "local" &&
        (localState === "unsupported" || fallback) && (
          <div className="border-b border-amber-300/60 bg-amber-50 px-5 py-2 text-xs text-amber-800 sm:px-8">
            <div className="mx-auto max-w-6xl">
              {localState === "unsupported"
                ? "This device can’t run the on-device model (no WebGPU here), so Foil is using the cloud coach instead."
                : "The on-device model couldn’t finish here, so Foil used the cloud coach for that answer."}
              {fallback && lastLocalError && (
                <details className="mt-1">
                  <summary className="cursor-pointer underline">why? (details)</summary>
                  <div className="mt-1 flex items-start gap-2">
                    <pre className="max-h-32 flex-1 overflow-auto whitespace-pre-wrap rounded border border-amber-300/60 bg-amber-100/60 p-2 font-mono text-[0.7rem] leading-relaxed">
                      {lastLocalError}
                    </pre>
                    <button
                      onClick={() => navigator.clipboard?.writeText(lastLocalError)}
                      className="shrink-0 rounded border border-amber-400 px-2 py-1 font-medium hover:bg-amber-100"
                    >
                      Copy
                    </button>
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

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
                Exchange {exchangeCount(session.turns)} / {EPISODE_LENGTH}
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
                    {progress
                      ? "Loading the on-device coach…"
                      : genTokens > 0
                        ? `Thinking on your device… (${genTokens} tokens)`
                        : getEngine(engineId).kind === "local"
                          ? `Thinking on your device… ${elapsed}s`
                          : "Thinking…"}
                  </p>
                  {busy &&
                    !progress &&
                    genTokens === 0 &&
                    getEngine(engineId).kind === "local" && (
                      <p className="text-xs text-ink/40">
                        The first answer is slower while your device warms up.
                      </p>
                    )}
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
                {engine.kind === "local" &&
                !fallback &&
                localState !== "unsupported" &&
                localState !== "error"
                  ? "Running on your device. Your questions never leave it."
                  : "Running on the cloud coach. Your questions are sent to the model and not stored."}
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
  localState,
  localProgress,
  fallback,
}: {
  engineId: EngineId;
  onChange: (id: EngineId) => void;
  localState: "idle" | "loading" | "ready" | "unsupported" | "error";
  localProgress: number;
  fallback: boolean;
}) {
  const [open, setOpen] = useState(false);
  const engine = getEngine(engineId);
  const hasGpu = webgpuAvailable();

  let label: string;
  let dot: string;
  if (engine.kind === "cloud") {
    label = "Cloud";
    dot = "bg-amber-500";
  } else if (fallback || localState === "unsupported" || localState === "error") {
    label = "Cloud fallback";
    dot = "bg-amber-500";
  } else if (localState === "loading") {
    label = `On-device ${Math.round(localProgress * 100)}%`;
    dot = "bg-amber-500 animate-pulse";
  } else {
    label = "On-device";
    dot = "bg-emerald-500";
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
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
            On-device keeps every question private to your machine. The cloud coach is
            only used when your device can&rsquo;t run a model.
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingScreen({
  failed,
  progress,
  text,
  log,
  error,
  onCopy,
  onRetry,
  onUseCloud,
}: {
  failed: boolean;
  progress: number;
  text: string;
  log: string[];
  error: string | null;
  onCopy: () => void;
  onRetry: () => void;
  onUseCloud: () => void;
}) {
  const pct = Math.round(progress * 100);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 px-5 backdrop-blur-sm">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <Gears failed={failed} />
          <h2 className="mt-4 font-serif text-2xl">
            {failed ? "The on-device coach didn’t load" : "Starting your on-device coach"}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-ink/60">
            {failed
              ? "Downloaded pieces are saved, so “Try again” resumes where it left off — it won’t restart from zero. On a slow connection it can take a few tries. Or use the cloud coach now and let it finish later."
              : "A small model is loading into your browser. This happens once. After that it runs fully on your device, private and offline."}
          </p>
        </div>

        {!failed && (
          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-ink/55">
              <span className="truncate font-mono">{text || "Initializing…"}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
          </div>
        )}

        {failed && error && (
          <pre className="mt-5 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-red-300 bg-red-50 p-3 font-mono text-[0.7rem] leading-relaxed text-red-900">
            {error}
          </pre>
        )}

        <details className="mt-4" open={failed}>
          <summary className="cursor-pointer text-xs text-ink/50">
            {failed ? "Full log" : "Show log"}
          </summary>
          <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-ink/10 bg-card p-3 font-mono text-[0.7rem] leading-relaxed text-ink/70">
            {log.join("\n") || "…"}
          </pre>
        </details>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={onCopy}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            Copy log
          </button>
          {failed && (
            <button
              onClick={onRetry}
              className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              Try again
            </button>
          )}
          <button
            onClick={onUseCloud}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper"
          >
            Use cloud coach
          </button>
        </div>
      </div>
    </div>
  );
}
