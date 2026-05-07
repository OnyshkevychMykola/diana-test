import { describe, expect, it } from 'vitest';
import { parseKeywords } from '../keywordParser';

describe('parseKeywords', () => {
  it('returns empty array for empty input', () => {
    expect(parseKeywords('')).toEqual([]);
    expect(parseKeywords('   \n  \n')).toEqual([]);
  });

  it('parses simple keyword without count', () => {
    expect(parseKeywords('hiking')).toEqual([{ keyword: 'hiking' }]);
  });

  it('parses keyword with hyphen separator', () => {
    expect(parseKeywords('hiking - 3')).toEqual([{ keyword: 'hiking', requiredCount: 3 }]);
  });

  it('parses keyword with colon separator', () => {
    expect(parseKeywords('hiking: 3')).toEqual([{ keyword: 'hiking', requiredCount: 3 }]);
  });

  it('parses keyword with space-only separator', () => {
    expect(parseKeywords('hiking 5')).toEqual([{ keyword: 'hiking', requiredCount: 5 }]);
  });

  it('parses multi-word keyword without count', () => {
    expect(parseKeywords('whitewater rafting')).toEqual([{ keyword: 'whitewater rafting' }]);
  });

  it('parses multi-word keyword with count', () => {
    expect(parseKeywords('whitewater rafting - 2')).toEqual([
      { keyword: 'whitewater rafting', requiredCount: 2 },
    ]);
  });

  it('parses multiple lines', () => {
    const input = 'hiking - 3\nfishing 5\nkayaking tour\nтуризм: 4';
    expect(parseKeywords(input)).toEqual([
      { keyword: 'hiking', requiredCount: 3 },
      { keyword: 'fishing', requiredCount: 5 },
      { keyword: 'kayaking tour' },
      { keyword: 'туризм', requiredCount: 4 },
    ]);
  });

  it('skips empty and whitespace-only lines', () => {
    expect(parseKeywords('hiking\n\n   \nfishing')).toEqual([
      { keyword: 'hiking' },
      { keyword: 'fishing' },
    ]);
  });

  it('deduplicates by keyword keeping max count', () => {
    expect(parseKeywords('tour - 2\ntour - 5\ntour')).toEqual([
      { keyword: 'tour', requiredCount: 5 },
    ]);
  });

  it('treats undefined count as smaller than any defined count during dedup', () => {
    expect(parseKeywords('tour\ntour - 3')).toEqual([{ keyword: 'tour', requiredCount: 3 }]);
  });

  it('is case-insensitive when deduplicating', () => {
    expect(parseKeywords('Tour - 2\ntour - 5')).toEqual([{ keyword: 'Tour', requiredCount: 5 }]);
  });
});
