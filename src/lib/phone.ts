export function normalisePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("234") && d.length === 13) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  if (d.length === 10) return "234" + d; // e.g. 8012345678 typed without leading 0
  return null;
}

export function phoneVariants(e164: string): string[] {
  const local = "0" + e164.slice(3);
  return [e164, local];
}

// Normalise a name for comparison: lowercase, collapse whitespace,
// strip anything that isn't a letter/space (handles stray punctuation).
function normaliseNameWords(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * True if every word the parent typed appears somewhere in the student's
 * registered full name (order-independent, tolerates a missing middle
 * name), AND at least two words were typed — so a lone common first
 * name isn't enough on its own to pass.
 */
export function nameMatches(typed: string, actualFullName: string): boolean {
  const typedWords = normaliseNameWords(typed);
  if (typedWords.length < 2) return false;

  const actualWords = new Set(normaliseNameWords(actualFullName));
  return typedWords.every((w) => actualWords.has(w));
}