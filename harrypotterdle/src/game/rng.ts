/** Deterministic 32-bit string hash (FNV-1a). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small, fast, seedable PRNG. Same seed always yields the same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one item deterministically from a seed string. */
export function pickBySeed<T>(items: readonly T[], seed: string): T {
  return items[hashString(seed) % items.length];
}

/** Pick one item at random (for unlimited play). */
export function pickRandom<T>(items: readonly T[], exclude?: (item: T) => boolean): T {
  const pool = exclude ? items.filter((i) => !exclude(i)) : items;
  const source = pool.length ? pool : items;
  return source[Math.floor(Math.random() * source.length)];
}
