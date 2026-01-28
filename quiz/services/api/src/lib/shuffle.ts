// Deterministic shuffle using seed
export function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let currentSeed = hashCode(seed);

  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = nextRandom(currentSeed);
    const j = Math.abs(currentSeed) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function nextRandom(seed: number): number {
  // Linear Congruential Generator
  return (seed * 1103515245 + 12345) & 0x7fffffff;
}

export function generateShuffleSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
