import {
  GeneratedTextPackSchema,
  GoldenEvaluationCorpusSchema,
  ModelEvaluationResultSchema,
  type GeneratedTextPack,
  type GoldenEvaluationCase,
  type ModelEvaluationResult,
} from "@oalo/contracts";

export interface GoldenEvaluationCandidate {
  readonly caseRef: string;
  readonly output: unknown;
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/gu, " ").trim();
}

function containsEvery(text: string, phrases: readonly string[]): boolean {
  const normalizedText = normalize(text);
  return phrases.every((phrase) => normalizedText.includes(normalize(phrase)));
}

function containsNone(text: string, phrases: readonly string[]): boolean {
  const normalizedText = normalize(text);
  return phrases.every((phrase) => !normalizedText.includes(normalize(phrase)));
}

function flattenPack(pack: GeneratedTextPack): string {
  return pack.pieces
    .flatMap(({ headline, body, callToAction }) => [headline, body, callToAction])
    .join("\n");
}

function matchesExpectedPieces(
  pack: GeneratedTextPack,
  evaluationCase: GoldenEvaluationCase,
): boolean {
  if (pack.pieces.length !== evaluationCase.expectedPieces.length) return false;
  const actual = new Map(pack.pieces.map((piece) => [piece.pieceRef, piece.channel]));
  if (actual.size !== pack.pieces.length) return false;
  return evaluationCase.expectedPieces.every(
    ({ pieceRef, channel }) => actual.get(pieceRef) === channel,
  );
}

function freezeResult(result: ModelEvaluationResult): ModelEvaluationResult {
  for (const item of result.results) Object.freeze(item);
  Object.freeze(result.results);
  return Object.freeze(result);
}

export function evaluateGoldenCampaignCorpus(
  routeRef: string,
  unsafeCorpus: unknown,
  candidates: readonly GoldenEvaluationCandidate[],
): ModelEvaluationResult {
  const corpus = GoldenEvaluationCorpusSchema.parse(unsafeCorpus);
  const caseRefs = new Set(corpus.cases.map(({ caseRef }) => caseRef));
  const candidatesByCase = new Map<string, unknown>();
  for (const candidate of candidates) {
    if (!caseRefs.has(candidate.caseRef)) {
      throw new Error(`Golden candidate ${candidate.caseRef} is not part of the corpus`);
    }
    if (candidatesByCase.has(candidate.caseRef)) {
      throw new Error(`Golden candidate ${candidate.caseRef} is duplicated`);
    }
    candidatesByCase.set(candidate.caseRef, candidate.output);
  }
  const missingCases = corpus.cases
    .filter(({ caseRef }) => !candidatesByCase.has(caseRef))
    .map(({ caseRef }) => caseRef);
  if (missingCases.length > 0) {
    throw new Error(`Golden candidates are missing cases: ${missingCases.join(", ")}`);
  }

  const results = corpus.cases.map((evaluationCase) => {
    const parsed = GeneratedTextPackSchema.safeParse(candidatesByCase.get(evaluationCase.caseRef));
    if (!parsed.success) {
      return {
        caseRef: evaluationCase.caseRef,
        brandFidelityPassed: false,
        structuredOutputPassed: false,
        bannedClaimPassed: false,
        frameworkPassed: false,
        noInventedFactsPassed: false,
      };
    }
    const text = flattenPack(parsed.data);
    return {
      caseRef: evaluationCase.caseRef,
      brandFidelityPassed: containsEvery(text, evaluationCase.requiredBrandPhrases),
      structuredOutputPassed: matchesExpectedPieces(parsed.data, evaluationCase),
      bannedClaimPassed: containsNone(text, evaluationCase.bannedClaimPhrases),
      frameworkPassed: containsEvery(text, evaluationCase.requiredFrameworkPhrases),
      noInventedFactsPassed:
        containsEvery(text, evaluationCase.requiredFactPhrases) &&
        containsNone(text, evaluationCase.forbiddenInventedFactPhrases),
    };
  });

  return freezeResult(
    ModelEvaluationResultSchema.parse({
      routeRef,
      corpusVersionRef: corpus.corpusVersionRef,
      results,
    }),
  );
}
