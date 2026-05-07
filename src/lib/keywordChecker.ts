import type { KeywordResult, ParsedKeyword } from './types';

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const UNDEFINED_EXCESS_THRESHOLD = 2;

function escapeRegex(input: string): string {
  return input.replace(REGEX_SPECIAL, '\\$&');
}

function buildKeywordRegex(rawKeyword: string): RegExp {
  const normalized = rawKeyword.normalize('NFC').trim();
  const tokens = normalized.split(/\s+/).map(escapeRegex);
  const body = tokens.join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'giu');
}

function countMatches(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function classify(
  actual: number,
  requiredCount: number | undefined,
): { status: KeywordResult['status']; delta: number } {
  if (requiredCount === undefined) {
    if (actual === 0) return { status: 'missing', delta: 1 };
    if (actual > UNDEFINED_EXCESS_THRESHOLD) {
      return { status: 'excess', delta: actual - UNDEFINED_EXCESS_THRESHOLD };
    }
    return { status: 'ok', delta: 0 };
  }

  if (actual < requiredCount) return { status: 'missing', delta: requiredCount - actual };
  if (actual > requiredCount) return { status: 'excess', delta: actual - requiredCount };
  return { status: 'ok', delta: 0 };
}

export function checkKeywords(rawText: string, keywords: ParsedKeyword[]): KeywordResult[] {
  const text = rawText.normalize('NFC');
  return keywords.map((kw) => {
    const regex = buildKeywordRegex(kw.keyword);
    const actualCount = countMatches(text, regex);
    const { status, delta } = classify(actualCount, kw.requiredCount);
    return {
      keyword: kw.keyword,
      requiredCount: kw.requiredCount,
      actualCount,
      status,
      delta,
    };
  });
}
