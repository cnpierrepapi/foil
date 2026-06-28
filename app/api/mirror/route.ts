import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// One-time setup utility: mirror an MLC model's weight files from HuggingFace
// into our Vercel Blob store, so end users download from a fast, reliable CDN
// instead of HuggingFace. Runs on Vercel's network, so the bytes never touch a
// developer's connection. Protected by MIRROR_SECRET.

export const runtime = "nodejs";
export const maxDuration = 60;

const hf = (model: string, file: string) =>
  `https://huggingface.co/mlc-ai/${model}/resolve/main/${file}`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!process.env.MIRROR_SECRET || url.searchParams.get("secret") !== process.env.MIRROR_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const model = url.searchParams.get("model") || "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";

  // List mode: figure out which files make up this model.
  if (url.searchParams.get("list")) {
    const [nd, cfg] = await Promise.all([
      fetch(hf(model, "ndarray-cache.json")).then((r) => r.json()),
      fetch(hf(model, "mlc-chat-config.json")).then((r) => r.json()),
    ]);
    const shards: string[] = Array.from(
      new Set((nd.records ?? []).map((r: { dataPath: string }) => r.dataPath)),
    );
    const files = [
      "mlc-chat-config.json",
      "ndarray-cache.json",
      ...(cfg.tokenizer_files ?? []),
      ...shards,
    ];
    return NextResponse.json({ model, count: files.length, files });
  }

  // File mode: copy one file from HuggingFace into Blob at <model>/<file>.
  const file = url.searchParams.get("file");
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });

  const res = await fetch(hf(model, file));
  if (!res.ok) {
    return NextResponse.json({ error: `HuggingFace ${res.status} for ${file}` }, { status: 502 });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // WebLLM builds file URLs as `${modelUrl}/resolve/main/${file}` (HF-style),
  // so store the files under that same subpath on our CDN.
  const blob = await put(`${model}/resolve/main/${file}`, buf, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: file.endsWith(".json") ? "application/json" : "application/octet-stream",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return NextResponse.json({ file, size: buf.byteLength, url: blob.url });
}
