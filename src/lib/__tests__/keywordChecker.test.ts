import { describe, expect, it } from 'vitest';
import { checkKeywords } from '../keywordChecker';

const findResult = (results: ReturnType<typeof checkKeywords>, keyword: string) =>
  results.find((r) => r.keyword === keyword)!;

describe('checkKeywords — matching', () => {
  it('returns empty array when no keywords given', () => {
    expect(checkKeywords('any text', [])).toEqual([]);
  });

  it('counts case-insensitive occurrences', () => {
    const results = checkKeywords('Tour and tour and TOUR', [{ keyword: 'tour' }]);
    expect(findResult(results, 'tour').actualCount).toBe(3);
  });

  it('respects word boundaries (no match inside larger word)', () => {
    const results = checkKeywords('tourist contour tour', [{ keyword: 'tour' }]);
    expect(findResult(results, 'tour').actualCount).toBe(1);
  });

  it('matches at start, end, around punctuation', () => {
    const results = checkKeywords('Tour. (tour) "tour"', [{ keyword: 'tour' }]);
    expect(findResult(results, 'tour').actualCount).toBe(3);
  });

  it('counts overlapping keywords independently', () => {
    const results = checkKeywords('kayaking tour and walking tour and tour packages', [
      { keyword: 'tour' },
      { keyword: 'kayaking tour' },
    ]);
    expect(findResult(results, 'tour').actualCount).toBe(3);
    expect(findResult(results, 'kayaking tour').actualCount).toBe(1);
  });

  it('matches multi-word keyword with extra whitespace in text', () => {
    const results = checkKeywords('whitewater  rafting and whitewater rafting', [
      { keyword: 'whitewater rafting' },
    ]);
    expect(findResult(results, 'whitewater rafting').actualCount).toBe(2);
  });

  it('matches Cyrillic with word boundaries', () => {
    const results = checkKeywords('Туризм це круто. туризму бракує. турист.', [
      { keyword: 'туризм' },
    ]);
    expect(findResult(results, 'туризм').actualCount).toBe(1);
  });

  it('handles mixed Cyrillic + Latin text', () => {
    const results = checkKeywords('eco туризм and tour туризм', [
      { keyword: 'туризм' },
      { keyword: 'tour' },
    ]);
    expect(findResult(results, 'туризм').actualCount).toBe(2);
    expect(findResult(results, 'tour').actualCount).toBe(1);
  });

  it('handles regex special characters in keyword', () => {
    const results = checkKeywords('I use node.js daily. Not nodexjs.', [{ keyword: 'node.js' }]);
    expect(findResult(results, 'node.js').actualCount).toBe(1);
  });

  it('handles hyphenated keyword', () => {
    const results = checkKeywords('follow-up and follow up', [{ keyword: 'follow-up' }]);
    expect(findResult(results, 'follow-up').actualCount).toBe(1);
  });

  it('returns 0 actualCount when keyword absent', () => {
    const results = checkKeywords('hello world', [{ keyword: 'missing' }]);
    expect(findResult(results, 'missing').actualCount).toBe(0);
  });
});

describe('checkKeywords — classification', () => {
  it('classifies undefined-count keyword: 0 → missing', () => {
    const r = findResult(checkKeywords('nothing here', [{ keyword: 'tour' }]), 'tour');
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(1);
  });

  it('classifies undefined-count keyword: 1 → ok', () => {
    const r = findResult(checkKeywords('tour once', [{ keyword: 'tour' }]), 'tour');
    expect(r.status).toBe('ok');
    expect(r.delta).toBe(0);
  });

  it('classifies undefined-count keyword: 2 → ok', () => {
    const r = findResult(checkKeywords('tour and tour', [{ keyword: 'tour' }]), 'tour');
    expect(r.status).toBe('ok');
  });

  it('classifies undefined-count keyword: 3 → excess (delta over threshold 2)', () => {
    const r = findResult(checkKeywords('tour tour tour', [{ keyword: 'tour' }]), 'tour');
    expect(r.status).toBe('excess');
    expect(r.delta).toBe(1);
  });

  it('classifies count=3: 0 → missing delta 3', () => {
    const r = findResult(checkKeywords('', [{ keyword: 'tour', requiredCount: 3 }]), 'tour');
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(3);
  });

  it('classifies count=3: 2 → missing delta 1', () => {
    const r = findResult(
      checkKeywords('tour and tour', [{ keyword: 'tour', requiredCount: 3 }]),
      'tour',
    );
    expect(r.status).toBe('missing');
    expect(r.delta).toBe(1);
  });

  it('classifies count=3: 3 → ok', () => {
    const r = findResult(
      checkKeywords('tour tour tour', [{ keyword: 'tour', requiredCount: 3 }]),
      'tour',
    );
    expect(r.status).toBe('ok');
    expect(r.delta).toBe(0);
  });

  it('classifies count=3: 5 → excess delta 2', () => {
    const r = findResult(
      checkKeywords('tour tour tour tour tour', [{ keyword: 'tour', requiredCount: 3 }]),
      'tour',
    );
    expect(r.status).toBe('excess');
    expect(r.delta).toBe(2);
  });

  it('handles NFC vs NFD unicode normalization', () => {
    const composed = 'café';
    const decomposed = 'cafe\u0301';
    const r = findResult(checkKeywords(decomposed, [{ keyword: composed }]), composed);
    expect(r.actualCount).toBe(1);
  });
});
