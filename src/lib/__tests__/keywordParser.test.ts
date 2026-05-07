import { describe, expect, it } from 'vitest';
import { parseKeywords } from '../keywordParser';

describe('parseKeywords', () => {
  it('returns empty array for empty input', () => {
    expect(parseKeywords('')).toEqual([]);
    expect(parseKeywords('   \n  \n')).toEqual([]);
  });

  it('parses simple keyword without count to default 1..2 range', () => {
    expect(parseKeywords('hiking')).toEqual([
      { keyword: 'hiking', requiredMin: 1, requiredMax: 2 },
    ]);
  });

  it('parses keyword with hyphen separator as exact count', () => {
    expect(parseKeywords('hiking - 3')).toEqual([
      { keyword: 'hiking', requiredMin: 3, requiredMax: 3 },
    ]);
  });

  it('parses keyword with colon separator as exact count', () => {
    expect(parseKeywords('hiking: 3')).toEqual([
      { keyword: 'hiking', requiredMin: 3, requiredMax: 3 },
    ]);
  });

  it('parses keyword with space-only separator as exact count', () => {
    expect(parseKeywords('hiking 5')).toEqual([
      { keyword: 'hiking', requiredMin: 5, requiredMax: 5 },
    ]);
  });

  it('parses multi-word keyword without count', () => {
    expect(parseKeywords('whitewater rafting')).toEqual([
      { keyword: 'whitewater rafting', requiredMin: 1, requiredMax: 2 },
    ]);
  });

  it('parses multi-word keyword with exact count', () => {
    expect(parseKeywords('whitewater rafting - 2')).toEqual([
      { keyword: 'whitewater rafting', requiredMin: 2, requiredMax: 2 },
    ]);
  });

  it('parses range with explicit hyphen separator', () => {
    expect(parseKeywords('bonus code - 5-10')).toEqual([
      { keyword: 'bonus code', requiredMin: 5, requiredMax: 10 },
    ]);
  });

  it('parses range with explicit colon separator', () => {
    expect(parseKeywords('bonus code: 5-10')).toEqual([
      { keyword: 'bonus code', requiredMin: 5, requiredMax: 10 },
    ]);
  });

  it('parses range with implicit space separator', () => {
    expect(parseKeywords('bonus code 5-10')).toEqual([
      { keyword: 'bonus code', requiredMin: 5, requiredMax: 10 },
    ]);
  });

  it('normalizes inverted range to ascending order', () => {
    expect(parseKeywords('tour - 10-5')).toEqual([
      { keyword: 'tour', requiredMin: 5, requiredMax: 10 },
    ]);
  });

  it('tolerates extra whitespace inside range', () => {
    expect(parseKeywords('tour 5 - 10')).toEqual([
      { keyword: 'tour', requiredMin: 5, requiredMax: 10 },
    ]);
  });

  it('parses multi-word keyword with range', () => {
    expect(parseKeywords('whitewater rafting 5-10')).toEqual([
      { keyword: 'whitewater rafting', requiredMin: 5, requiredMax: 10 },
    ]);
  });

  it('parses multiple lines of mixed formats', () => {
    const input = 'hiking - 3\nfishing 5\nbonus code 5-10\ntour\nтуризм: 4';
    expect(parseKeywords(input)).toEqual([
      { keyword: 'hiking', requiredMin: 3, requiredMax: 3 },
      { keyword: 'fishing', requiredMin: 5, requiredMax: 5 },
      { keyword: 'bonus code', requiredMin: 5, requiredMax: 10 },
      { keyword: 'tour', requiredMin: 1, requiredMax: 2 },
      { keyword: 'туризм', requiredMin: 4, requiredMax: 4 },
    ]);
  });

  it('skips empty and whitespace-only lines', () => {
    expect(parseKeywords('hiking\n\n   \nfishing')).toEqual([
      { keyword: 'hiking', requiredMin: 1, requiredMax: 2 },
      { keyword: 'fishing', requiredMin: 1, requiredMax: 2 },
    ]);
  });

  it('deduplicates by keyword keeping entry with widest upper bound', () => {
    expect(parseKeywords('tour - 2\ntour - 5\ntour')).toEqual([
      { keyword: 'tour', requiredMin: 5, requiredMax: 5 },
    ]);
  });

  it('default 1..2 entry is replaced by any explicit higher bound', () => {
    expect(parseKeywords('tour\ntour - 3')).toEqual([
      { keyword: 'tour', requiredMin: 3, requiredMax: 3 },
    ]);
  });

  it('range with higher upper bound wins during dedup', () => {
    expect(parseKeywords('tour - 3\ntour 2-7')).toEqual([
      { keyword: 'tour', requiredMin: 2, requiredMax: 7 },
    ]);
  });

  it('is case-insensitive when deduplicating', () => {
    expect(parseKeywords('Tour - 2\ntour - 5')).toEqual([
      { keyword: 'tour', requiredMin: 5, requiredMax: 5 },
    ]);
  });
});
