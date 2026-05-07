import type { ParsedKeyword } from './types';

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 2;

const EXPLICIT_RANGE = /^(.+?)\s*[-:]\s*(\d+)\s*-\s*(\d+)\s*$/;
const EXPLICIT_COUNT = /^(.+?)\s*[-:]\s*(\d+)\s*$/;
const TRAILING_RANGE = /^(.+?)\s+(\d+)\s*-\s*(\d+)\s*$/;
const TRAILING_COUNT = /^(.+?)\s+(\d+)\s*$/;

function makeRange(keyword: string, a: number, b: number): ParsedKeyword {
  return {
    keyword: keyword.trim(),
    requiredMin: Math.min(a, b),
    requiredMax: Math.max(a, b),
  };
}

function makeExact(keyword: string, n: number): ParsedKeyword {
  return { keyword: keyword.trim(), requiredMin: n, requiredMax: n };
}

function parseLine(line: string): ParsedKeyword | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const explicitRange = EXPLICIT_RANGE.exec(trimmed);
  if (explicitRange) {
    return makeRange(explicitRange[1], Number(explicitRange[2]), Number(explicitRange[3]));
  }

  const trailingRange = TRAILING_RANGE.exec(trimmed);
  if (trailingRange) {
    return makeRange(trailingRange[1], Number(trailingRange[2]), Number(trailingRange[3]));
  }

  const explicitCount = EXPLICIT_COUNT.exec(trimmed);
  if (explicitCount) {
    return makeExact(explicitCount[1], Number(explicitCount[2]));
  }

  const trailingCount = TRAILING_COUNT.exec(trimmed);
  if (trailingCount) {
    return makeExact(trailingCount[1], Number(trailingCount[2]));
  }

  return { keyword: trimmed, requiredMin: DEFAULT_MIN, requiredMax: DEFAULT_MAX };
}

export function parseKeywords(raw: string): ParsedKeyword[] {
  const seen = new Map<string, ParsedKeyword>();

  for (const line of raw.split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const key = parsed.keyword.toLowerCase();
    const existing = seen.get(key);

    if (!existing || parsed.requiredMax > existing.requiredMax) {
      seen.set(key, parsed);
    }
  }

  return Array.from(seen.values());
}
