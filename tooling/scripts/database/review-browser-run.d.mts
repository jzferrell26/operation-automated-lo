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

export function reviewServerEnvironment(databaseUrl: string): Readonly<Record<string, string>>;
export function certificateCommand(directory: string): ReviewCertificateCommand;
export function parseReviewRunArguments(
  argv: readonly string[],
): Readonly<{ databaseUrl: string; seededCredentials: ReviewSeededCredentials }>;
export function runReviewBrowserSuite(options: ReviewBrowserRunOptions): Promise<void>;
