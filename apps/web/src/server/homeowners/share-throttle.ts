/**
 * A small per-address allowance for the two unauthenticated doors into a shared report: the report
 * page and `/api/homeowner-reports/shared/[secret]`.
 *
 * Why it exists. Both answer anyone, and a link that is well shaped costs a database round trip
 * sequence (begin, switch role, query, commit) whether or not a report is behind it. The link is
 * 256 bits, so nobody can find a real one by asking; the exposure is that a caller can spend the
 * deployment's database connections on links that do not exist. The sign-in routes already count
 * attempts per address for the same reason. This is the same idea for the shared report, without a
 * database round trip of its own, so that refusing a caller is cheaper than serving one.
 *
 * What it is not. It keeps its counts in memory, so each server instance counts for itself and a
 * restart forgets them. That makes it a backstop that bounds what one address can drive through one
 * instance, not a fleet-wide limit. The fleet-wide limit is a Vercel Firewall rate-limit rule on
 * `/home-report/*` and `/api/homeowner-reports/shared/*`, which the activation runbook asks for.
 *
 * Which address. The platform presents the client address in a forwarded header, read in the same
 * order and on the same trust as `clientAddressFor` in `password-authentication-handler.ts`: Vercel
 * sets and overwrites all three, so a caller cannot choose the value. Hosting anywhere else needs
 * that reviewed before this is relied on. A request that names no address is not counted, because
 * it cannot be told apart from every other such request, and counting them together would let one
 * local test run, or one unlabelled caller, spend everyone's allowance.
 */

export interface BudgetDecision {
  readonly allowed: boolean;
  /** Whole seconds until the caller's window ends. Zero when the request is allowed. */
  readonly retryAfterSeconds: number;
}

export interface AddressBudget {
  consume(address: string): BudgetDecision;
  /** How many addresses are currently remembered. */
  readonly size: number;
}

export interface AddressBudgetOptions {
  readonly limit: number;
  readonly windowMs: number;
  /** The most addresses remembered at once, so a flood of distinct callers cannot grow memory. */
  readonly maxAddresses?: number;
  readonly now?: () => number;
}

const ALLOWED: BudgetDecision = Object.freeze({ allowed: true, retryAfterSeconds: 0 });

export function createAddressBudget(options: AddressBudgetOptions): AddressBudget {
  const { limit, windowMs } = options;
  const maxAddresses = options.maxAddresses ?? 10_000;
  const clock = options.now ?? Date.now;
  // Insertion order is window-start order, because a window that resets is removed and re-added.
  const windows = new Map<string, { start: number; count: number }>();

  function makeRoom(now: number): void {
    for (const [address, window] of windows)
      if (now - window.start >= windowMs) windows.delete(address);
    while (windows.size >= maxAddresses) {
      const oldest = windows.keys().next();
      if (oldest.done === true) break;
      windows.delete(oldest.value);
    }
  }

  return {
    consume(address) {
      const now = clock();
      const current = windows.get(address);
      if (current === undefined || now - current.start >= windowMs) {
        if (current === undefined && windows.size >= maxAddresses) makeRoom(now);
        windows.delete(address);
        windows.set(address, { start: now, count: 1 });
        return ALLOWED;
      }
      current.count += 1;
      if (current.count <= limit) return ALLOWED;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.start + windowMs - now) / 1000)),
      };
    },
    get size() {
      return windows.size;
    },
  };
}

/** A person opening a report link needs one read. Sixty a minute is generous for a shared office. */
export const SHARED_REPORT_READS_PER_MINUTE = 60;
/** An explicit request for a review is a deliberate click, and the first one is all that is kept. */
export const SHARED_REPORT_EVENTS_PER_MINUTE = 10;

const budgets = {
  read: createAddressBudget({ limit: SHARED_REPORT_READS_PER_MINUTE, windowMs: 60_000 }),
  event: createAddressBudget({ limit: SHARED_REPORT_EVENTS_PER_MINUTE, windowMs: 60_000 }),
};

/** The headers the client address is read from, most specific first. */
const CLIENT_ADDRESS_HEADERS = Object.freeze([
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
] as const);

export function shareClientAddress(headers: Headers): string | undefined {
  for (const name of CLIENT_ADDRESS_HEADERS) {
    const first = headers.get(name)?.split(",")[0]?.trim();
    if (first !== undefined && first.length > 0 && first.length <= 100) return first;
  }
  return undefined;
}

export function consumeSharedReportBudget(
  headers: Headers,
  kind: "read" | "event",
): BudgetDecision {
  const address = shareClientAddress(headers);
  return address === undefined ? ALLOWED : budgets[kind].consume(address);
}

export function resetSharedReportBudgetsForTests(): void {
  budgets.read = createAddressBudget({ limit: SHARED_REPORT_READS_PER_MINUTE, windowMs: 60_000 });
  budgets.event = createAddressBudget({ limit: SHARED_REPORT_EVENTS_PER_MINUTE, windowMs: 60_000 });
}
