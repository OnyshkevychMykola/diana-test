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
  it('returns no issues when structures match exactly', () => {
    const original = doc('Original', [['h2', 'Payment'], ['h3', 'Cards']]);
    const compared = doc('T2', [['h2', 'Payment'], ['h3', 'Cards']]);
    const [result] = compareStructures(original, [compared]);
    expect(result.issues).toHaveLength(0);
  });

  it('reports extra headings not in original', () => {
    const original = doc('Original', [['h2', 'Payment']]);
    const compared = doc('T2', [['h2', 'Payment'], ['h3', 'Cards'], ['h3', 'Wallets']]);
    const [result] = compareStructures(original, [compared]);
    const extras = result.issues.filter((i) => i.kind === 'extra');
    expect(extras).toHaveLength(2);
    expect(extras.map((i) => i.comparedHeading?.text)).toEqual(['Cards', 'Wallets']);
  });

  it('reports missing headings from original', () => {
    const original = doc('Original', [['h2', 'Payment'], ['h2', 'Games']]);
    const compared = doc('T2', [['h2', 'Payment']]);
    const [result] = compareStructures(original, [compared]);
    const missing = result.issues.filter((i) => i.kind === 'missing');
    expect(missing).toHaveLength(1);
    expect(missing[0].originalHeading?.text).toBe('Games');
  });

  it('ignores meta-title and meta-description, compares H1–H4', () => {
    const original = doc('Original', [
      ['meta-title', 'Casino'],
      ['h1', 'Main'],
      ['h2', 'Payment'],
    ]);
    const compared = doc('T2', [
      ['meta-title', 'Other Casino'],
      ['h1', 'Main'],
      ['h2', 'Payment'],
    ]);
    const [result] = compareStructures(original, [compared]);
    expect(result.issues).toHaveLength(0);
  });

  it('detects H1 mismatch when H1 headings differ significantly', () => {
    const original = doc('Original', [['h1', 'Main Title']]);
    const compared = doc('T2', [['h1', 'Different Topic']]);
    const [result] = compareStructures(original, [compared]);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    const original = doc('Original', [['h2', 'Payment']]);
    const compared = doc('T2', [['h2', 'payment']]);
    const [result] = compareStructures(original, [compared]);
    expect(result.issues).toHaveLength(0);
  });

  it('detects wrong heading level', () => {
    const original = doc('Original', [['h2', 'Features'], ['h3', 'Benefits']]);
    const compared = doc('T2', [['h2', 'Features'], ['h2', 'Benefits']]);
    const [result] = compareStructures(original, [compared]);
    const levelIssues = result.issues.filter((i) => i.kind === 'wrong-level');
    expect(levelIssues).toHaveLength(1);
    expect(levelIssues[0].message).toContain('H3');
  });

  it('detects semantic mismatch for low-overlap headings', () => {
    const original = doc('Original', [['h2', 'Benefits overview']]);
    const compared = doc('T2', [['h2', 'Benefits summary']]);
    const [result] = compareStructures(original, [compared]);
    // "benefits" token shared → they match, but low overall score → mismatch reported
    const mismatch = result.issues.filter((i) => i.kind === 'meaning-mismatch');
    expect(mismatch).toHaveLength(1);
  });

  it('detects order violation', () => {
    const original = doc('Original', [['h2', 'Intro'], ['h2', 'Payment'], ['h2', 'Support']]);
    const compared = doc('T2', [['h2', 'Support'], ['h2', 'Intro'], ['h2', 'Payment']]);
    const [result] = compareStructures(original, [compared]);
    const orderIssues = result.issues.filter((i) => i.kind === 'order');
    expect(orderIssues.length).toBeGreaterThan(0);
  });

  it('handles multiple compared documents', () => {
    const original = doc('Original', [['h2', 'Payment']]);
    const t2 = doc('T2', [['h2', 'Payment'], ['h3', 'Extra']]);
    const t3 = doc('T3', [['h2', 'Completely Different']]);
    const result = compareStructures(original, [t2, t3]);
    expect(result).toHaveLength(2);
    expect(result[0].documentLabel).toBe('T2');
    expect(result[0].issues.some((i) => i.kind === 'extra')).toBe(true);
    expect(result[1].documentLabel).toBe('T3');
    expect(result[1].issues.some((i) => i.kind === 'missing')).toBe(true);
  });

  it('reports duplicate heading in compared as extra', () => {
    const original = doc('Original', [['h2', 'Payment']]);
    const compared = doc('T2', [['h2', 'Payment'], ['h2', 'Payment']]);
    const [result] = compareStructures(original, [compared]);
    const extras = result.issues.filter((i) => i.kind === 'extra');
    expect(extras).toHaveLength(1);
  });

  it('includes parent context in missing heading message', () => {
    const original = doc('Original', [['h2', 'Features'], ['h3', 'Details']]);
    const compared = doc('T2', [['h2', 'Features']]);
    const [result] = compareStructures(original, [compared]);
    const missing = result.issues.find((i) => i.kind === 'missing');
    expect(missing?.message).toContain('Features');
  });
});
