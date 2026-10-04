/** PRD-009c 009C-AC-004. Scans a production build for any trace of the sample ads. */

export interface SampleTrace {
  readonly file: string;
  readonly marker: string;
}

export function findSampleTraces(
  buildDirectory: string,
  sampleCatalogFile?: string,
): Promise<SampleTrace[]>;
