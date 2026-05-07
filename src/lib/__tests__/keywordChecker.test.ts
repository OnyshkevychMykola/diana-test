import { describe, expect, it } from 'vitest';
import { checkKeywords } from '../keywordChecker';
import type { ParsedKeyword } from '../types';

const findResult = (results: ReturnType<typeof checkKeywords>, keyword: string) =>
  results.find((r) => r.keyword === keyword)!;

const exact = (keyword: string, n: number): ParsedKeyword => ({
  keyword,
  requiredMin: n,
  requiredMax: n,
});
const range = (keyword: string, min: number, max: number): ParsedKeyword => ({
  keyword,
  requiredMin: min,
  requiredMax: max,
});
const def = (keyword: string): ParsedKeyword => ({
  keyword,
  requiredMin: 1,
  requiredMax: 2,
});

describe('checkKeywords — matching', () => {
  it('returns empty array when no keywords given', () => {
    expect(checkKeywords('any text', [])).toEqual([]);
  });

  it('counts case-insensitive occurrences', () => {
    const results = checkKeywords('Tour and tour and TOUR', [def('tour')]);
    expect(findResult(results, 'tour').actualCount).toBe(3);
  });

  it('respects word boundaries (no match inside larger word)', () => {
    const results = checkKeywords('tourist contour tour', [def('tour')]);
    expect(findResult(results, 'tour').actualCount).toBe(1);
  });

  it('matches at start, end, around punctuation', () => {
    const results = checkKeywords('Tour. (tour) "tour"', [def('tour')]);
    expect(findResult(results, 'tour').actualCount).toBe(3);
  });

  it('counts overlapping keywords independently', () => {
    const results = checkKeywords('kayaking tour and walking tour and tour packages', [
      def('tour'),
      def('kayaking tour'),
    ]);
    expect(findResult(results, 'tour').actualCount).toBe(3);
    expect(findResult(results, 'kayaking tour').actualCount).toBe(1);
  });

  it('matches multi-word keyword with extra whitespace in text', () => {
    const results = checkKeywords('whitewater  rafting and whitewater rafting', [
      def('whitewater rafting'),
    ]);
    expect(findResult(results, 'whitewater rafting').actualCount).toBe(2);
  });

  it('matches Cyrillic with word boundaries', () => {
    const results = checkKeywords('Туризм це круто. туризму бракує. турист.', [def('туризм')]);
    expect(findResult(results, 'туризм').actualCount).toBe(1);
  });

  it('handles mixed Cyrillic + Latin text', () => {
    const results = checkKeywords('eco туризм and tour туризм', [def('туризм'), def('tour')]);
    expect(findResult(results, 'туризм').actualCount).toBe(2);
    expect(findResult(results, 'tour').actualCount).toBe(1);
  });

  it('handles regex special characters in keyword', () => {
    const results = checkKeywords('I use node.js daily. Not nodexjs.', [def('node.js')]);
    expect(findResult(results, 'node.js').actualCount).toBe(1);
  });

  it('handles hyphenated keyword', () => {
    const results = checkKeywords('follow-up and follow up', [def('follow-up')]);
    expect(findResult(results, 'follow-up').actualCount).toBe(1);
  });

  it('returns 0 actualCount when keyword absent', () => {
    const results = checkKeywords('hello world', [def('missing')]);
    expect(findResult(results, 'missing').actualCount).toBe(0);
  });
});

describe('checkKeywords — classification', () => {
  it('classifies default 1..2: 0 → missing delta 1', () => {
    const r = findResult(checkKeywords('nothing here', [def('tour')]), 'tour');
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(1);
  });

  it('classifies default 1..2: 1 → ok', () => {
    const r = findResult(checkKeywords('tour once', [def('tour')]), 'tour');
    expect(r.status).toBe('ok');
    expect(r.delta).toBe(0);
  });

  it('classifies default 1..2: 2 → ok', () => {
    const r = findResult(checkKeywords('tour and tour', [def('tour')]), 'tour');
    expect(r.status).toBe('ok');
  });

  it('classifies default 1..2: 3 → excess delta 1', () => {
    const r = findResult(checkKeywords('tour tour tour', [def('tour')]), 'tour');
    expect(r.status).toBe('excess');
    expect(r.delta).toBe(1);
  });

  it('classifies exact 3: 0 → missing delta 3', () => {
    const r = findResult(checkKeywords('', [exact('tour', 3)]), 'tour');
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(3);
  });

  it('classifies exact 3: 2 → missing delta 1', () => {
    const r = findResult(checkKeywords('tour and tour', [exact('tour', 3)]), 'tour');
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(1);
  });

  it('classifies exact 3: 3 → ok', () => {
    const r = findResult(checkKeywords('tour tour tour', [exact('tour', 3)]), 'tour');
    expect(r.status).toBe('ok');
    expect(r.delta).toBe(0);
  });

  it('classifies exact 3: 5 → excess delta 2', () => {
    const r = findResult(checkKeywords('tour tour tour tour tour', [exact('tour', 3)]), 'tour');
    expect(r.status).toBe('excess');
    expect(r.delta).toBe(2);
  });

  it('classifies range 5..10: 4 → missing delta 1', () => {
    const text = 'tour '.repeat(4);
    const r = findResult(checkKeywords(text, [range('tour', 5, 10)]), 'tour');
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(1);
  });

  it('classifies range 5..10: 5 → ok', () => {
    const text = 'tour '.repeat(5);
    const r = findResult(checkKeywords(text, [range('tour', 5, 10)]), 'tour');
    expect(r.status).toBe('ok');
  });

  it('classifies range 5..10: 7 → ok', () => {
    const text = 'tour '.repeat(7);
    const r = findResult(checkKeywords(text, [range('tour', 5, 10)]), 'tour');
    expect(r.status).toBe('ok');
  });

  it('classifies range 5..10: 10 → ok', () => {
    const text = 'tour '.repeat(10);
    const r = findResult(checkKeywords(text, [range('tour', 5, 10)]), 'tour');
    expect(r.status).toBe('ok');
  });

  it('classifies range 5..10: 12 → excess delta 2', () => {
    const text = 'tour '.repeat(12);
    const r = findResult(checkKeywords(text, [range('tour', 5, 10)]), 'tour');
    expect(r.status).toBe('excess');
    expect(r.delta).toBe(2);
  });

  it('handles NFC vs NFD unicode normalization', () => {
    const composed = 'café';
    const decomposed = 'cafe\u0301';
    const r = findResult(checkKeywords(decomposed, [def(composed)]), composed);
    expect(r.actualCount).toBe(1);
  });
});
