import type { ParsedKeyword } from './types';

const EXPLICIT_SEPARATOR = /^(.+?)\s*[-:]\s*(\d+)\s*$/;
const TRAILING_NUMBER = /^(.+?)\s+(\d+)\s*$/;

function parseLine(line: string): ParsedKeyword | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const explicit = EXPLICIT_SEPARATOR.exec(trimmed);
  if (explicit) {
    return { keyword: explicit[1].trim(), requiredCount: Number(explicit[2]) };
  }

  const trailing = TRAILING_NUMBER.exec(trimmed);
  if (trailing) {
    return { keyword: trailing[1].trim(), requiredCount: Number(trailing[2]) };
  }

  return { keyword: trimmed };
}

export function parseKeywords(raw: string): ParsedKeyword[] {
  const seen = new Map<string, ParsedKeyword>();

  for (const line of raw.split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const key = parsed.keyword.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, parsed);
      continue;
    }

    const existingCount = existing.requiredCount ?? -1;
    const newCount = parsed.requiredCount ?? -1;
    if (newCount > existingCount) {
      seen.set(key, { ...existing, requiredCount: parsed.requiredCount });
    }
  }

  return Array.from(seen.values());
}
