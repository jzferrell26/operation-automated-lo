/**
 * PRD-009c, 009C-AC-013. What `import "server-only"` resolves to under Vitest.
 *
 * Next.js aliases `server-only` itself (to an empty module for the server and to one that throws for
 * the browser), so the build needs no package, and the lockfile gains none (MTK-010). Vitest has no
 * such alias, so `vitest.config.ts` points the name here: a test is a server-side run, and the
 * import must do nothing in it. Nothing outside the tests imports this file.
 */
export {};
