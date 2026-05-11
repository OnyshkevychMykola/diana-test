import { describe, expect, it } from 'vitest';
import { compareStructures } from '../structureCompare';
import type { ParsedDocument } from '../types';

function doc(label: string, headings: [string, string][]): ParsedDocument {
  return {
    label,
    headings: headings.map(([level, text]) => ({
      level: level as never,
      text,
      textLower: text.normalize('NFC').toLowerCase().trim(),
    })),
  };
}

describe('compareStructures', () => {
  it('returns empty extra/missing when structures match', () => {
    const original = doc('Оригінал', [['h2', 'Оплата'], ['h3', 'Картки']]);
    const compared = doc('T2', [['h2', 'Оплата'], ['h3', 'Картки']]);
    const result = compareStructures(original, [compared]);
    expect(result).toHaveLength(1);
    expect(result[0].extra).toEqual([]);
    expect(result[0].missing).toEqual([]);
  });

  it('finds extra headings in compared doc', () => {
    const original = doc('Оригінал', [['h2', 'Оплата']]);
    const compared = doc('T2', [['h2', 'Оплата'], ['h3', 'Картки'], ['h3', 'Гаманці']]);
    const result = compareStructures(original, [compared]);
    expect(result[0].extra).toHaveLength(2);
    expect(result[0].extra.map((h) => h.text)).toEqual(['Картки', 'Гаманці']);
    expect(result[0].missing).toEqual([]);
  });

  it('finds missing headings in compared doc', () => {
    const original = doc('Оригінал', [['h2', 'Оплата'], ['h2', 'Ігри']]);
    const compared = doc('T2', [['h2', 'Оплата']]);
    const result = compareStructures(original, [compared]);
    expect(result[0].missing).toHaveLength(1);
    expect(result[0].missing[0].text).toBe('Ігри');
    expect(result[0].extra).toEqual([]);
  });

  it('ignores meta-title, meta-description, and h1 — compares only h2-h4', () => {
    const original = doc('Оригінал', [
      ['meta-title', 'Казино'],
      ['h1', 'Головний'],
      ['h2', 'Оплата'],
    ]);
    const compared = doc('T2', [
      ['meta-title', 'Інше казино'],
      ['h1', 'Різний h1'],
      ['h2', 'Оплата'],
    ]);
    const result = compareStructures(original, [compared]);
    expect(result[0].extra).toEqual([]);
    expect(result[0].missing).toEqual([]);
  });

  it('is case-insensitive (оплата = Оплата)', () => {
    const original = doc('Оригінал', [['h2', 'Оплата']]);
    const compared = doc('T2', [['h2', 'оплата']]);
    const result = compareStructures(original, [compared]);
    expect(result[0].extra).toEqual([]);
    expect(result[0].missing).toEqual([]);
  });

  it('handles multiple compared documents', () => {
    const original = doc('Оригінал', [['h2', 'Оплата']]);
    const t2 = doc('T2', [['h2', 'Оплата'], ['h3', 'Зайвий']]);
    const t3 = doc('T3', [['h2', 'Інший']]);
    const result = compareStructures(original, [t2, t3]);
    expect(result).toHaveLength(2);
    expect(result[0].documentLabel).toBe('T2');
    expect(result[0].extra).toHaveLength(1);
    expect(result[1].documentLabel).toBe('T3');
    expect(result[1].missing).toHaveLength(1);
  });

  it('comparison is by unique set — count of occurrences does not matter', () => {
    const original = doc('Оригінал', [['h2', 'Оплата']]);
    const compared = doc('T2', [['h2', 'Оплата'], ['h2', 'Оплата']]);
    const result = compareStructures(original, [compared]);
    expect(result[0].extra).toEqual([]);
  });
});
