"use client";

import { DIMENSIONS, DIMENSION_LABELS, type Episode } from "./types";
import { masteryBand } from "./scoring";

// A self-contained SVG report card (no Tailwind classes, no external assets) so
// it renders identically when rasterized to PNG for download/sharing.

const PAPER = "#f5f1e8";
const CARD = "#fbf8f1";
const INK = "#211f1b";
const ACCENT = "#b4541e";
const W = 600;
const H = 780;

const ANGLES: Record<string, number> = {
  curiosity: -90,
  specificity: 0,
  assumptions: 90,
  evidence: 180,
};

function pt(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function radar(ep: Episode, cx: number, cy: number, R: number): string {
  const s = ep.stats.traitAverages;
  let out = "";
  for (const ring of [1, 2, 3, 4, 5]) {
    const rr = (ring / 5) * R;
    const d =
      DIMENSIONS.map((dim, i) => {
        const [x, y] = pt(cx, cy, rr, ANGLES[dim]);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ") + "Z";
    out += `<path d="${d}" fill="none" stroke="${INK}" stroke-opacity="0.12"/>`;
  }
  for (const dim of DIMENSIONS) {
    const [x, y] = pt(cx, cy, R, ANGLES[dim]);
    out += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${INK}" stroke-opacity="0.12"/>`;
  }
  const verts = DIMENSIONS.map((dim) => pt(cx, cy, (Math.max(0, Math.min(5, s[dim])) / 5) * R, ANGLES[dim]));
  const poly = verts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + "Z";
  out += `<path d="${poly}" fill="${ACCENT}" fill-opacity="0.2" stroke="${ACCENT}" stroke-width="2" stroke-linejoin="round"/>`;
  for (const [x, y] of verts) out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${ACCENT}"/>`;
  for (const dim of DIMENSIONS) {
    const [lx, ly] = pt(cx, cy, R + 20, ANGLES[dim]);
    const anchor = ANGLES[dim] === 0 ? "start" : ANGLES[dim] === 180 ? "end" : "middle";
    out += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${INK}" fill-opacity="0.65">${DIMENSION_LABELS[dim]} ${s[dim].toFixed(1)}</text>`;
  }
  return out;
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
}

export function reportSvgString(ep: Episode): string {
  const date = new Date(ep.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const source = ep.source.length > 90 ? ep.source.slice(0, 87) + "…" : ep.source;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="24" fill="${CARD}" stroke="${INK}" stroke-opacity="0.08"/>
  <text x="48" y="74" font-family="Georgia, serif" font-size="26" fill="${INK}">Foil</text>
  <text x="${W - 48}" y="74" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="13" fill="${INK}" fill-opacity="0.5">Inquiry report · ${date}</text>
  <text x="48" y="116" font-family="Inter, system-ui, sans-serif" font-size="13" fill="${INK}" fill-opacity="0.5">YOU INVESTIGATED</text>
  <text x="48" y="142" font-family="Georgia, serif" font-size="18" fill="${INK}">${esc(source)}</text>
  <text x="${W / 2}" y="210" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" fill="${INK}" fill-opacity="0.5">MASTERY</text>
  <text x="${W / 2}" y="290" text-anchor="middle" font-family="Georgia, serif" font-size="76" fill="${ACCENT}">${ep.stats.mastery.toFixed(2)}</text>
  <text x="${W / 2}" y="320" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="15" fill="${INK}" fill-opacity="0.7">${masteryBand(ep.stats.mastery)} · ${ep.stats.exchanges} exchanges</text>
  <g>${radar(ep, W / 2, 510, 150)}</g>
  <text x="${W / 2}" y="730" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" fill="${INK}" fill-opacity="0.45">Sharpest: ${DIMENSION_LABELS[ep.stats.strongest]} · Grow next: ${DIMENSION_LABELS[ep.stats.weakest]}</text>
</svg>`;
}

export async function downloadReportPng(ep: Episode): Promise<void> {
  const svg = reportSvgString(ep);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `foil-report-${new Date(ep.createdAt).toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  } finally {
    URL.revokeObjectURL(url);
  }
}
