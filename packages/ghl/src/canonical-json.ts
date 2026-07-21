export function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const sortedEntries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(sortedEntries.map(([key, entry]) => [key, canonicalizeJson(entry)]));
}
