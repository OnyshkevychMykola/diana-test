import type { KeywordResult, ParsedKeyword } from './types';

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

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
  min: number,
  max: number,
): { status: KeywordResult['status']; delta: number } {
  if (actual < min) return { status: 'missing', delta: min - actual };
  if (actual > max) return { status: 'excess', delta: actual - max };
  return { status: 'ok', delta: 0 };
}

export function checkKeywords(rawText: string, keywords: ParsedKeyword[]): KeywordResult[] {
  const text = rawText.normalize('NFC');
  return keywords.map((kw) => {
    const regex = buildKeywordRegex(kw.keyword);
    const actualCount = countMatches(text, regex);
    const { status, delta } = classify(actualCount, kw.requiredMin, kw.requiredMax);
    return {
      keyword: kw.keyword,
      requiredMin: kw.requiredMin,
      requiredMax: kw.requiredMax,
      actualCount,
      status,
      delta,
    };
  });
}
