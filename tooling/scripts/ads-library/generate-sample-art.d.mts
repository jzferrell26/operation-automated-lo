/** PRD-009c D2, 009C-AC-003. The deterministic sample ads generator. */

export type SampleArtShape = "tall" | "square";

export interface SampleAdSpec {
  readonly id: string;
  readonly version: number;
  readonly status: "active" | "retired" | "replaced";
  readonly topic: string;
  readonly accent: string;
  readonly name: string;
  readonly alt: string;
  readonly headline: string;
  readonly primaryText: string;
  readonly approvedOn: string;
  readonly notes: string;
  readonly retired?: Readonly<{ on: string; reason: string; replacedBy: string | null }>;
}

export const SAMPLE_MARK_INK: readonly [number, number, number];
export const SAMPLE_ADS: readonly SampleAdSpec[];
export function sampleMarkProbes(shape: SampleArtShape): Array<[number, number]>;
export function renderSampleArt(spec: SampleAdSpec, shape: SampleArtShape): Promise<Buffer>;
export function generateSampleAds(paths: {
  readonly artRoot: string;
  readonly catalogFile: string;
  readonly lockFile: string;
}): Promise<unknown[]>;
