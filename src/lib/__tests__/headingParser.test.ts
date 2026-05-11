// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../headingParser';

describe('parseDocument - notation parsing', () => {
  it('returns empty headings for blank text', () => {
    const result = parseDocument('Текст 1', '');
    expect(result).toEqual({ label: 'Текст 1', headings: [] });
  });

  it('parses Meta Title line', () => {
    const result = parseDocument('T', 'Meta Title: Казино України');
    expect(result.headings).toEqual([
      { level: 'meta-title', text: 'Казино України', textLower: 'казино україни' },
    ]);
  });

  it('parses Meta Description line', () => {
    const result = parseDocument('T', 'Meta Description: Огляд казино');
    expect(result.headings).toEqual([
      { level: 'meta-description', text: 'Огляд казино', textLower: 'огляд казино' },
    ]);
  });

  it('parses H1 through H4 lines', () => {
    const input = 'H1: Заголовок\nH2: Розділ\nH3: Підрозділ\nH4: Деталь';
    const result = parseDocument('T', input);
    expect(result.headings.map((h) => h.level)).toEqual(['h1', 'h2', 'h3', 'h4']);
    expect(result.headings.map((h) => h.text)).toEqual([
      'Заголовок', 'Розділ', 'Підрозділ', 'Деталь',
    ]);
  });

  it('is case-insensitive for prefix (h2: vs H2: vs H2 :)', () => {
    const input = 'h2: нижній\nH2: Великий\nH2 : Пробіл';
    const result = parseDocument('T', input);
    expect(result.headings.every((h) => h.level === 'h2')).toBe(true);
    expect(result.headings.map((h) => h.text)).toEqual([
      'нижній', 'Великий', 'Пробіл',
    ]);
  });

  it('normalizes textLower with NFC and lowercase', () => {
    const result = parseDocument('T', 'H1: Café');
    expect(result.headings[0].textLower).toBe('café');
  });

  it('ignores lines that do not match any prefix', () => {
    const input = 'This is body text.\nH2: Заголовок\nMore body text.';
    const result = parseDocument('T', input);
    expect(result.headings).toHaveLength(1);
    expect(result.headings[0].level).toBe('h2');
  });

  it('preserves label in result', () => {
    const result = parseDocument('Оригінал', 'H2: Test');
    expect(result.label).toBe('Оригінал');
  });

  it('parses mixed full document', () => {
    const input = [
      'Meta Title: Казино',
      'Meta Description: Огляд',
      'H1: Головний',
      'H2: Методи оплати',
      'H3: Картки',
      'H4: Visa',
    ].join('\n');
    const result = parseDocument('T', input);
    expect(result.headings.map((h) => h.level)).toEqual([
      'meta-title', 'meta-description', 'h1', 'h2', 'h3', 'h4',
    ]);
  });
});
