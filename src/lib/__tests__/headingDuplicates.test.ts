import { describe, expect, it } from 'vitest';
import { findDuplicates } from '../headingDuplicates';
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

describe('findDuplicates', () => {
  it('returns empty array when no duplicates', () => {
    const docs = [
      doc('T1', [['h2', 'Оплата']]),
      doc('T2', [['h2', 'Ігри']]),
    ];
    expect(findDuplicates(docs)).toEqual([]);
  });

  it('finds duplicate h2 across two documents', () => {
    const docs = [
      doc('T1', [['h2', 'Оплата']]),
      doc('T2', [['h2', 'Оплата']]),
    ];
    const result = findDuplicates(docs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      level: 'h2',
      text: 'Оплата',
      foundInDocuments: ['T1', 'T2'],
    });
  });

  it('is case-insensitive (Оплата vs оплата = duplicate)', () => {
    const docs = [
      doc('T1', [['h2', 'Оплата']]),
      doc('T2', [['h2', 'оплата']]),
    ];
    const result = findDuplicates(docs);
    expect(result).toHaveLength(1);
    expect(result[0].foundInDocuments).toEqual(['T1', 'T2']);
  });

  it('does NOT flag same heading appearing twice in the same document', () => {
    const docs = [
      doc('T1', [['h2', 'Оплата'], ['h2', 'Оплата']]),
      doc('T2', [['h2', 'Ігри']]),
    ];
    expect(findDuplicates(docs)).toEqual([]);
  });

  it('groups duplicates separately per level', () => {
    const docs = [
      doc('T1', [['h2', 'Топ'], ['h3', 'Топ']]),
      doc('T2', [['h2', 'Топ'], ['h3', 'Топ']]),
    ];
    const result = findDuplicates(docs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.level).sort()).toEqual(['h2', 'h3']);
  });

  it('finds duplicate meta-title', () => {
    const docs = [
      doc('T1', [['meta-title', 'Казино України']]),
      doc('T2', [['meta-title', 'Казино України']]),
      doc('T3', [['meta-title', 'Інше казино']]),
    ];
    const result = findDuplicates(docs);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe('meta-title');
    expect(result[0].foundInDocuments).toEqual(['T1', 'T2']);
  });

  it('uses display text from first occurrence', () => {
    const docs = [
      doc('T1', [['h1', 'Казино']]),
      doc('T2', [['h1', 'казино']]),
    ];
    const result = findDuplicates(docs);
    expect(result[0].text).toBe('Казино');
  });

  it('returns empty array for single document', () => {
    const docs = [doc('T1', [['h2', 'Оплата']])];
    expect(findDuplicates(docs)).toEqual([]);
  });
});
