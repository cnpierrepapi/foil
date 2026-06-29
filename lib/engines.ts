// The engines a learner can run the coach on. Claude (cloud) is the default for
// quality. On-device Qwen models are an opt-in, fully private alternative that
// runs in the browser over WebGPU.

export type EngineId = "cloud" | "local-1_5b" | "local-7b";

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
    id: "cloud",
    kind: "cloud",
    label: "Cloud · Claude",
    size: "no download",
    blurb: "Best quality and the default. Questions are sent to the model and not stored.",
  },
  {
    id: "local-1_5b",
    kind: "local",
    label: "On-device · Qwen2.5 1.5B",
    model: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    modelF32: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
    size: "~1.1 GB, one-time",
    blurb: "Private and offline. A one-time download, then runs fully on your device.",
  },
  {
    id: "local-7b",
    kind: "local",
    label: "On-device · Qwen2.5 7B",
    model: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    modelF32: "Qwen2.5-7B-Instruct-q4f32_1-MLC",
    size: "~4.7 GB, one-time",
    blurb: "Sharpest on-device option, for capable, well-connected machines.",
  },
];

export function getEngine(id: EngineId): EngineDef {
  return ENGINES.find((e) => e.id === id) ?? ENGINES[0];
}

export function isEngineId(v: string | null): v is EngineId {
  return !!v && ENGINES.some((e) => e.id === v);
}

export function webgpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
