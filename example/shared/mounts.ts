// Tiny module-level store counting how many times each route key has mounted.
// A kept screen must stay at 1 after a prune, which proves it was not remounted.

const counts: Record<string, { name: string; count: number }> = {};

export function recordMount(key: string, name: string): void {
  const entry = counts[key];
  if (entry) entry.count += 1;
  else counts[key] = { name, count: 1 };
}

export function mountCountFor(key: string): number {
  return counts[key]?.count ?? 0;
}

export function resetMounts(): void {
  for (const key of Object.keys(counts)) delete counts[key];
}
