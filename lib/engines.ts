// The engines a learner can run the coach on. Local-first: the model runs in
// the browser over WebGPU and nothing leaves the device. Claude is the fallback.

export type EngineId = "local-1_5b" | "local-7b" | "cloud";

export interface EngineDef {
  id: EngineId;
  kind: "local" | "cloud";
  label: string;
  // WebLLM prebuilt model ids (local engines only). The f16 build is smaller and
  // faster but needs the WebGPU shader-f16 feature; f32 runs on any WebGPU device.
  model?: string;
  modelF32?: string;
  size: string;
  blurb: string;
}

export const ENGINES: EngineDef[] = [
  {
    id: "local-1_5b",
    kind: "local",
    label: "On-device · Qwen2.5 1.5B",
    model: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    modelF32: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
    size: "~1.1 GB, one-time",
    blurb: "Runs entirely in your browser. Private and offline after the first load.",
  },
  {
    id: "local-7b",
    kind: "local",
    label: "On-device · Qwen2.5 7B",
    model: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    modelF32: "Qwen2.5-7B-Instruct-q4f32_1-MLC",
    size: "~4.7 GB, one-time",
    blurb: "Sharper coaching for capable machines. Still fully on-device.",
  },
  {
    id: "cloud",
    kind: "cloud",
    label: "Cloud · Claude",
    size: "no download",
    blurb: "Best quality, used when your device can't run a local model.",
  },
];

export function getEngine(id: EngineId): EngineDef {
  return ENGINES.find((e) => e.id === id) ?? ENGINES[0];
}

export function webgpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
