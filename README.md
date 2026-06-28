# Foil

**The AI that won't give you the answer.**

Foil is a Socratic thinking coach. You bring it something you want to understand — a claim, a question, an argument, a real-world phenomenon — and it refuses to resolve it for you. Instead it asks the next question that moves your own thinking forward, and it scores the quality of each question you ask. It is the inverse of a chatbot: where other tools hand you the conclusion, Foil builds the muscle behind getting there yourself.

It is built as a digital public good: open source, privacy-first, and free to run.

## Why

As AI gets better at producing answers, the answer itself becomes abundant. What stays scarce and human is the part on either side of the answer: **asking the right question, and judging whether the answer is any good.** That capability — inquiry, critical thinking, sense-making — compounds across every subject and every job, and it is the thing schooling optimizes for least now that a machine will do the homework for free.

Foil is a small, simple tool for practicing it.

## How it works

1. **You bring a source.** A claim from the news, a question you're studying, a line of argument, a phenomenon you can't explain.
2. **You investigate by asking.** You ask questions and reason out loud.
3. **The coach is bounded.** It is constrained never to give the answer, the fact, or the chain of reasoning that settles it. It asks one sharper question back.
4. **Your thinking is scored.** Each move is read across four dimensions — curiosity, specificity, the assumptions it surfaces, and the evidence it reaches for — so an invisible skill becomes visible and you can watch it improve over a session.

## Local-first, private by design

The coach runs **on your device**. A small open-weight model (Qwen2.5, Apache-2.0) runs directly in your browser via [WebLLM](https://github.com/mlc-ai/web-llm) over WebGPU. Your questions never leave your machine, it works offline after the first load, there is no account, and there is no per-question cost.

When a device can't run a local model (no WebGPU), Foil falls back to a cloud model (Claude, via the Anthropic API). The server is a stateless proxy — it stores no transcripts and keeps no accounts.

| Tier | Model | Notes |
| --- | --- | --- |
| On-device (default) | Qwen2.5-1.5B-Instruct | ~1.1 GB one-time download, fully private |
| On-device (capable machines) | Qwen2.5-7B-Instruct | Sharper coaching, still on-device |
| Cloud fallback | Claude | Used when WebGPU is unavailable |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The on-device tier needs no configuration. To enable the cloud fallback, set an Anthropic API key:

```bash
cp .env.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY
```

## Design principles

- **Design for impact** — train the one capability that compounds across everything.
- **Privacy by design** — inference runs on-device; the cloud path stores nothing.
- **Responsible AI** — the model is bounded so it cannot give the answer; that constraint is the product.
- **Product quality** — one screen, beautiful and calm, usable in ten seconds.
- **Keep it simple** — no account, no setup, no dark patterns, no engagement loops.

## Stack

Next.js (App Router) · React · Tailwind CSS · WebLLM (in-browser inference) · Anthropic SDK (cloud fallback).

## License

[AGPL-3.0](./LICENSE).
