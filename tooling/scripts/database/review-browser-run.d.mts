/** PRD-006c D9. The review browser run: a real review-mode server, a TLS terminator, and the
 * `review` Playwright project against both. */

export const REVIEW_HTTP_PORT: 3100;
export const REVIEW_HTTPS_PORT: 3443;
export const REVIEW_APP_URL: string;

export interface ReviewSeededCredentials {
  readonly creatorEmail: string;
  readonly approverEmail: string;
  readonly password: string;
}

export interface ReviewBrowserRunOptions {
  readonly repositoryRoot: string;
  readonly databaseUrl: string;
  readonly seededCredentials: ReviewSeededCredentials;
}

export interface ReviewCertificateCommand {
  readonly command: "openssl";
  readonly args: readonly string[];
}

/** PRD-009g. Which catalog the server under the browser project shows. */
export type ReviewCatalog = "samples" | "real";

export interface ReviewPass {
  readonly catalog: ReviewCatalog;
  readonly label: string;
  /** What the pass adds to the Playwright process's environment, to choose its spec set. */
  readonly environment: Readonly<Record<string, string>>;
}

/** PRD-009g, 009G-AC-001. The two passes of the browser project, in the order they run. */
export const REVIEW_PASSES: readonly ReviewPass[];

export function reviewServerEnvironment(
  databaseUrl: string,
  catalog?: ReviewCatalog,
): Readonly<Record<string, string>>;
export function playwrightReviewArguments(
  playwrightCli: string,
  baselineMode: string | undefined,
): readonly string[];
export function certificateCommand(directory: string): ReviewCertificateCommand;
export function parseReviewRunArguments(
  argv: readonly string[],
): Readonly<{ databaseUrl: string; seededCredentials: ReviewSeededCredentials }>;
export function runReviewBrowserSuite(options: ReviewBrowserRunOptions): Promise<void>;
