# Heading Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two SEO heading-analysis tools (Heading Duplicates, Structure Compare) to the existing Keyword Checker SPA, navigated via a tab switcher in the header.

**Architecture:** Tab state (`activeTool`) lives in `App.tsx`; each tool renders as a dedicated page component under `src/pages/`. Shared parsing logic lives in `src/lib/headingParser.ts`. No router is added.

**Tech Stack:** React 19, TypeScript ~6, Tailwind CSS 3, Vite 8, Vitest 4, `mammoth` (DOCX→HTML, browser-side), `jsdom` (vitest environment for DOMParser tests).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/types.ts` | Add heading types |
| Create | `src/lib/headingParser.ts` | Parse notation text / HTML / DOCX files into `ParsedDocument` |
| Create | `src/lib/headingDuplicates.ts` | Find duplicate headings across documents |
| Create | `src/lib/structureCompare.ts` | Diff h2–h4 structure vs original |
| Create | `src/lib/__tests__/headingParser.test.ts` | Unit tests (jsdom env for DOMParser) |
| Create | `src/lib/__tests__/headingDuplicates.test.ts` | Unit tests |
| Create | `src/lib/__tests__/structureCompare.test.ts` | Unit tests |
| Create | `src/components/TabNav.tsx` | Three-tab nav rendered in header |
| Create | `src/components/TextBlockInput.tsx` | Single text block: label + textarea + file upload |
| Create | `src/pages/KeywordCheckerPage.tsx` | Existing App logic extracted here |
| Create | `src/pages/HeadingDuplicatesPage.tsx` | Task 1 UI |
| Create | `src/pages/StructureComparePage.tsx` | Task 2 UI |
| Modify | `src/App.tsx` | Tab state + page routing |

---

## Task 1: Install dependencies + extend types

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/lib/types.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install mammoth and jsdom**

```bash
npm install mammoth
npm install -D jsdom @types/jsdom
```

Expected: packages added to `node_modules`, versions in `package.json`.

- [ ] **Step 2: Add heading types to `src/lib/types.ts`**

Replace the entire file content:

```ts
export type ParsedKeyword = {
  keyword: string;
  requiredMin: number;
  requiredMax: number;
};

export type KeywordStatus = 'ok' | 'missing' | 'excess';

export type KeywordResult = {
  keyword: string;
  requiredMin: number;
  requiredMax: number;
  actualCount: number;
  status: KeywordStatus;
  delta: number;
};

export type HeadingLevel =
  | 'meta-title'
  | 'meta-description'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4';

export interface ParsedHeading {
  level: HeadingLevel;
  text: string;      // trimmed original casing
  textLower: string; // NFC-normalized + lowercased, used for comparisons
}

export interface ParsedDocument {
  label: string;
  headings: ParsedHeading[];
}
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
npm run test:run
```

Expected: all existing tests pass (types change is additive).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts package.json package-lock.json
git commit -m "feat: add heading types and install mammoth"
```

---

## Task 2: headingParser — parseDocument (TDD)

**Files:**
- Create: `src/lib/headingParser.ts`
- Create: `src/lib/__tests__/headingParser.test.ts`

- [ ] **Step 1: Write failing tests for `parseDocument`**

Create `src/lib/__tests__/headingParser.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '../headingParser'`

- [ ] **Step 3: Create `src/lib/headingParser.ts` with `parseDocument`**

```ts
import type { HeadingLevel, ParsedDocument, ParsedHeading } from './types';

const NOTATION_PATTERN =
  /^(meta\s+title|meta\s+description|h[1-4])\s*:\s*(.+)$/i;

const PREFIX_TO_LEVEL: Record<string, HeadingLevel> = {
  'meta title': 'meta-title',
  'meta description': 'meta-description',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
};

function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase().trim();
}

function makeHeading(level: HeadingLevel, rawText: string): ParsedHeading {
  const text = rawText.trim();
  return { level, text, textLower: normalize(text) };
}

export function parseDocument(label: string, text: string): ParsedDocument {
  const headings: ParsedHeading[] = [];

  for (const line of text.split('\n')) {
    const match = line.trim().match(NOTATION_PATTERN);
    if (!match) continue;
    const prefix = match[1].replace(/\s+/g, ' ').toLowerCase();
    const level = PREFIX_TO_LEVEL[prefix];
    if (level) headings.push(makeHeading(level, match[2]));
  }

  return { label, headings };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/headingParser.ts src/lib/__tests__/headingParser.test.ts
git commit -m "feat: add parseDocument with notation parsing"
```

---

## Task 3: headingParser — htmlToNotationText (TDD with jsdom)

**Files:**
- Modify: `src/lib/headingParser.ts`
- Modify: `src/lib/__tests__/headingParser.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Enable jsdom environment for the headingParser test file**

Add the `// @vitest-environment jsdom` comment at the very top of `src/lib/__tests__/headingParser.test.ts` (before all imports):

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseDocument } from '../headingParser';
// ... rest of existing tests unchanged
```

- [ ] **Step 2: Add failing tests for `htmlToNotationText`**

Append to `src/lib/__tests__/headingParser.test.ts`:

```ts
import { htmlToNotationText } from '../headingParser';

describe('htmlToNotationText', () => {
  it('extracts h1-h4 into notation lines', () => {
    const html = '<h1>Title</h1><h2>Section</h2><h3>Sub</h3><h4>Detail</h4>';
    expect(htmlToNotationText(html)).toBe(
      'H1: Title\nH2: Section\nH3: Sub\nH4: Detail',
    );
  });

  it('extracts <title> as Meta Title', () => {
    const html = '<html><head><title>Page Title</title></head><body><h2>Section</h2></body></html>';
    expect(htmlToNotationText(html)).toBe('Meta Title: Page Title\nH2: Section');
  });

  it('extracts <meta name="description"> as Meta Description', () => {
    const html =
      '<html><head><meta name="description" content="Page desc"></head><body><h2>X</h2></body></html>';
    expect(htmlToNotationText(html)).toBe('Meta Description: Page desc\nH2: X');
  });

  it('returns empty string for html with no recognized elements', () => {
    expect(htmlToNotationText('<p>Just text</p>')).toBe('');
  });

  it('trims whitespace from heading text', () => {
    const html = '<h2>  Trimmed  </h2>';
    expect(htmlToNotationText(html)).toBe('H2: Trimmed');
  });

  it('skips empty headings', () => {
    const html = '<h2></h2><h3>Real</h3>';
    expect(htmlToNotationText(html)).toBe('H3: Real');
  });
});
```

- [ ] **Step 3: Run tests to confirm new tests fail**

```bash
npm run test:run
```

Expected: existing tests pass, new `htmlToNotationText` tests FAIL — `htmlToNotationText is not a function`.

- [ ] **Step 4: Add `htmlToNotationText` to `src/lib/headingParser.ts`**

Append to the existing file:

```ts
const TAG_TO_PREFIX: Record<string, string> = {
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
};

export function htmlToNotationText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines: string[] = [];

  const titleEl = doc.querySelector('title');
  if (titleEl?.textContent?.trim()) {
    lines.push(`Meta Title: ${titleEl.textContent.trim()}`);
  }

  const descMeta = doc.querySelector('meta[name="description"]');
  const descContent = descMeta?.getAttribute('content')?.trim();
  if (descContent) {
    lines.push(`Meta Description: ${descContent}`);
  }

  doc.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
    const text = el.textContent?.trim();
    const tag = el.tagName;
    if (text && TAG_TO_PREFIX[tag]) {
      lines.push(`${TAG_TO_PREFIX[tag]}: ${text}`);
    }
  });

  return lines.join('\n');
}
```

- [ ] **Step 5: Run tests to confirm all pass**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/headingParser.ts src/lib/__tests__/headingParser.test.ts
git commit -m "feat: add htmlToNotationText for HTML/DOCX file parsing"
```

---

## Task 4: headingParser — fileToNotationText (browser-only, no unit test)

**Files:**
- Modify: `src/lib/headingParser.ts`

`fileToNotationText` is async browser code (uses `FileReader` + `mammoth`). It is not unit-tested. It wraps already-tested functions.

- [ ] **Step 1: Add `fileToNotationText` to `src/lib/headingParser.ts`**

Append to the existing file:

```ts
import mammoth from 'mammoth';

export async function fileToNotationText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'html' || ext === 'htm') {
    const text = await file.text();
    return htmlToNotationText(text);
  }

  if (ext === 'docx') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const docxNotation = htmlToNotationText(result.value);
    // Also search raw docx text for Meta Title / Meta Description notation
    const rawResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    const metaLines = rawResult.value
      .split('\n')
      .filter((line) => /^(meta\s+title|meta\s+description)\s*:/i.test(line.trim()))
      .map((line) => line.trim());
    return [...metaLines, ...docxNotation.split('\n').filter((l) => !l.startsWith('Meta'))].join('\n');
  }

  throw new Error('unsupported-type');
}
```

- [ ] **Step 2: Run existing tests to ensure nothing broke**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/headingParser.ts
git commit -m "feat: add fileToNotationText for DOCX and HTML upload"
```

---

## Task 5: headingDuplicates.ts (TDD)

**Files:**
- Create: `src/lib/headingDuplicates.ts`
- Create: `src/lib/__tests__/headingDuplicates.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/headingDuplicates.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '../headingDuplicates'`

- [ ] **Step 3: Create `src/lib/headingDuplicates.ts`**

```ts
import type { DuplicateEntry, HeadingLevel, ParsedDocument } from './types';

export function findDuplicates(documents: ParsedDocument[]): DuplicateEntry[] {
  // Map: level → textLower → { displayText, Set<documentLabel> }
  const index = new Map<string, { text: string; labels: Set<string> }>();

  for (const doc of documents) {
    const seenInDoc = new Set<string>();
    for (const h of doc.headings) {
      const key = `${h.level}:::${h.textLower}`;
      if (seenInDoc.has(key)) continue; // skip same-doc duplicates
      seenInDoc.add(key);
      if (!index.has(key)) {
        index.set(key, { text: h.text, labels: new Set() });
      }
      index.get(key)!.labels.add(doc.label);
    }
  }

  const results: DuplicateEntry[] = [];
  for (const [key, { text, labels }] of index) {
    if (labels.size < 2) continue;
    const level = key.split(':::')[0] as HeadingLevel;
    results.push({ level, text, foundInDocuments: [...labels] });
  }
  return results;
}
```

- [ ] **Step 4: Add `DuplicateEntry` to `src/lib/types.ts`**

Append to `src/lib/types.ts`:

```ts
export interface DuplicateEntry {
  level: HeadingLevel;
  text: string;
  foundInDocuments: string[];
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/headingDuplicates.ts src/lib/__tests__/headingDuplicates.test.ts src/lib/types.ts
git commit -m "feat: add findDuplicates logic with tests"
```

---

## Task 6: structureCompare.ts (TDD)

**Files:**
- Create: `src/lib/structureCompare.ts`
- Create: `src/lib/__tests__/structureCompare.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/structureCompare.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '../structureCompare'`

- [ ] **Step 3: Create `src/lib/structureCompare.ts`**

```ts
import type { ParsedDocument, ParsedHeading, StructureDiff } from './types';

const COMPARED_LEVELS = new Set(['h2', 'h3', 'h4']);

function toSet(doc: ParsedDocument): Map<string, ParsedHeading> {
  const map = new Map<string, ParsedHeading>();
  for (const h of doc.headings) {
    if (!COMPARED_LEVELS.has(h.level)) continue;
    if (!map.has(h.textLower)) map.set(h.textLower, h);
  }
  return map;
}

export function compareStructures(
  original: ParsedDocument,
  compared: ParsedDocument[],
): StructureDiff[] {
  const originalSet = toSet(original);

  return compared.map((doc) => {
    const docSet = toSet(doc);
    const extra = [...docSet.values()].filter((h) => !originalSet.has(h.textLower));
    const missing = [...originalSet.values()].filter((h) => !docSet.has(h.textLower));
    return { documentLabel: doc.label, extra, missing };
  });
}
```

- [ ] **Step 4: Add `StructureDiff` to `src/lib/types.ts`**

Append to `src/lib/types.ts`:

```ts
export interface StructureDiff {
  documentLabel: string;
  extra: ParsedHeading[];
  missing: ParsedHeading[];
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/structureCompare.ts src/lib/__tests__/structureCompare.test.ts src/lib/types.ts
git commit -m "feat: add compareStructures logic with tests"
```

---

## Task 7: TabNav + extract KeywordCheckerPage + wire App.tsx

**Files:**
- Create: `src/components/TabNav.tsx`
- Create: `src/pages/KeywordCheckerPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/pages/KeywordCheckerPage.tsx`**

Move the existing content of `App.tsx` (without the outer shell) into this file:

```tsx
import { useCallback, useState } from 'react';
import { TextInputArea } from '../components/TextInputArea';
import { KeywordsInputArea } from '../components/KeywordsInputArea';
import { CheckResultPanel } from '../components/CheckResultPanel';
import { checkKeywords } from '../lib/keywordChecker';
import { parseKeywords } from '../lib/keywordParser';
import type { KeywordResult } from '../lib/types';

export function KeywordCheckerPage() {
  const [text, setText] = useState('');
  const [keywordsRaw, setKeywordsRaw] = useState('');
  const [results, setResults] = useState<KeywordResult[] | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const canCheck = text.trim().length > 0 && keywordsRaw.trim().length > 0;

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    const parsed = parseKeywords(keywordsRaw);
    const next = checkKeywords(text, parsed);
    setResults(next);
    setLastCheckedAt(new Date());
  }, [canCheck, keywordsRaw, text]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TextInputArea value={text} onChange={setText} onSubmit={handleCheck} />
        <KeywordsInputArea value={keywordsRaw} onChange={setKeywordsRaw} onSubmit={handleCheck} />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck}
          className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Перевірити
        </button>
      </div>

      <CheckResultPanel results={results} lastCheckedAt={lastCheckedAt} />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/TabNav.tsx`**

```tsx
type Tool = 'keyword' | 'heading-duplicates' | 'structure-compare';

interface Tab {
  id: Tool;
  label: string;
}

const TABS: Tab[] = [
  { id: 'keyword', label: 'Keyword Checker' },
  { id: 'heading-duplicates', label: 'Heading Duplicates' },
  { id: 'structure-compare', label: 'Structure Compare' },
];

interface TabNavProps {
  active: Tool;
  onChange: (tool: Tool) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            'rounded-md px-4 py-2 text-sm font-medium transition',
            active === tab.id
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export type { Tool };
```

- [ ] **Step 3: Update `src/App.tsx`**

Replace the entire file:

```tsx
import { useState } from 'react';
import { TabNav } from './components/TabNav';
import type { Tool } from './components/TabNav';
import { KeywordCheckerPage } from './pages/KeywordCheckerPage';
import { HeadingDuplicatesPage } from './pages/HeadingDuplicatesPage';
import { StructureComparePage } from './pages/StructureComparePage';

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('keyword');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">SEO Tools</h1>
          <TabNav active={activeTool} onChange={setActiveTool} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {activeTool === 'keyword' && <KeywordCheckerPage />}
        {activeTool === 'heading-duplicates' && <HeadingDuplicatesPage />}
        {activeTool === 'structure-compare' && <StructureComparePage />}
      </main>
    </div>
  );
}

export default App;
```

Note: `HeadingDuplicatesPage` and `StructureComparePage` will be created in the next tasks. Add temporary placeholder exports to avoid build errors (see next step).

- [ ] **Step 4: Add temporary placeholder pages**

Create `src/pages/HeadingDuplicatesPage.tsx`:

```tsx
export function HeadingDuplicatesPage() {
  return <div className="text-slate-500">Heading Duplicates — coming soon</div>;
}
```

Create `src/pages/StructureComparePage.tsx`:

```tsx
export function StructureComparePage() {
  return <div className="text-slate-500">Structure Compare — coming soon</div>;
}
```

- [ ] **Step 5: Verify the app builds and tabs work**

```bash
npm run build
```

Expected: build succeeds with no errors. Open `npm run dev` and verify three tabs appear and Keyword Checker still works.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/TabNav.tsx src/pages/KeywordCheckerPage.tsx src/pages/HeadingDuplicatesPage.tsx src/pages/StructureComparePage.tsx
git commit -m "feat: add tab navigation and extract KeywordCheckerPage"
```

---

## Task 8: TextBlockInput component (shared)

**Files:**
- Create: `src/components/TextBlockInput.tsx`

This component renders one text block: label, textarea, file upload button, and optional error message.

- [ ] **Step 1: Create `src/components/TextBlockInput.tsx`**

```tsx
import { useRef, useState } from 'react';
import { fileToNotationText } from '../lib/headingParser';

interface TextBlockInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  placeholder?: string;
}

export function TextBlockInput({
  label,
  value,
  onChange,
  onRemove,
  placeholder,
}: TextBlockInputProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'html' && ext !== 'htm') {
      setFileError('Підтримуються лише .docx та .html файли');
      e.target.value = '';
      return;
    }

    setFileError(null);
    setIsLoading(true);
    try {
      const notation = await fileToNotationText(file);
      onChange(notation);
    } catch {
      setFileError('Не вдалось обробити файл. Спробуйте інший формат');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isLoading ? 'Завантаження…' : 'Завантажити файл'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.html,.htm"
            className="hidden"
            onChange={handleFile}
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Видалити блок"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Meta Title: ...\nH1: ...\nH2: ...'}
        rows={8}
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
      />

      {fileError && (
        <p className="text-xs text-red-600">{fileError}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the app still builds**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TextBlockInput.tsx
git commit -m "feat: add TextBlockInput with file upload support"
```

---

## Task 9: HeadingDuplicatesPage (Task 1 UI)

**Files:**
- Modify: `src/pages/HeadingDuplicatesPage.tsx`

- [ ] **Step 1: Replace placeholder with full implementation**

```tsx
import { useState } from 'react';
import { TextBlockInput } from '../components/TextBlockInput';
import { findDuplicates } from '../lib/headingDuplicates';
import { parseDocument } from '../lib/headingParser';
import type { DuplicateEntry, HeadingLevel } from '../lib/types';

const MAX_TEXTS = 5;

const LEVEL_LABELS: Record<HeadingLevel, string> = {
  'meta-title': 'Meta Title',
  'meta-description': 'Meta Description',
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
};

const LEVEL_ORDER: HeadingLevel[] = [
  'meta-title',
  'meta-description',
  'h1',
  'h2',
  'h3',
  'h4',
];

export function HeadingDuplicatesPage() {
  const [texts, setTexts] = useState<string[]>(['', '']);
  const [duplicates, setDuplicates] = useState<DuplicateEntry[] | null>(null);

  const canCheck = texts.filter((t) => t.trim()).length >= 2;

  function updateText(index: number, value: string) {
    setTexts((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addText() {
    if (texts.length < MAX_TEXTS) setTexts((prev) => [...prev, '']);
  }

  function removeText(index: number) {
    setTexts((prev) => prev.filter((_, i) => i !== index));
    setDuplicates(null);
  }

  function handleCheck() {
    const docs = texts
      .map((t, i) => parseDocument(`Текст ${i + 1}`, t))
      .filter((d) => d.headings.length > 0);
    setDuplicates(findDuplicates(docs));
  }

  // Which levels appear in at least one document
  const docs = texts.map((t, i) => parseDocument(`Текст ${i + 1}`, t));
  const presentLevels = new Set(docs.flatMap((d) => d.headings.map((h) => h.level)));
  const dupsByLevel = new Map<HeadingLevel, DuplicateEntry[]>();
  if (duplicates) {
    for (const entry of duplicates) {
      if (!dupsByLevel.has(entry.level)) dupsByLevel.set(entry.level, []);
      dupsByLevel.get(entry.level)!.push(entry);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {texts.map((text, i) => (
          <TextBlockInput
            key={i}
            label={`Текст ${i + 1}`}
            value={text}
            onChange={(v) => updateText(i, v)}
            onRemove={texts.length > 2 ? () => removeText(i) : undefined}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        {texts.length < MAX_TEXTS && (
          <button
            type="button"
            onClick={addText}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            + Додати текст
          </button>
        )}
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck}
          className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Перевірити
        </button>
        {!canCheck && (
          <span className="text-xs text-slate-500">Додайте щонайменше 2 тексти</span>
        )}
      </div>

      {duplicates !== null && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {duplicates.length === 0 ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✓ Ідентичних заголовків не знайдено.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {LEVEL_ORDER.filter((level) => presentLevels.has(level)).map((level) => {
                const entries = dupsByLevel.get(level) ?? [];
                const hasDups = entries.length > 0;
                return (
                  <div
                    key={level}
                    className={[
                      'rounded-md border px-4 py-3',
                      hasDups
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{hasDups ? '⚠' : '✓'}</span>
                      <span className={hasDups ? 'text-amber-800' : 'text-emerald-700'}>
                        {LEVEL_LABELS[level]}
                        {hasDups
                          ? ` (${entries.length} ${entries.length === 1 ? 'дублікат' : 'дублікати'})`
                          : ' — дублікатів немає'}
                      </span>
                    </div>
                    {hasDups && (
                      <ul className="mt-2 flex flex-col gap-1">
                        {entries.map((entry) => (
                          <li key={entry.text} className="text-sm text-amber-900">
                            <span className="font-mono">"{entry.text}"</span>
                            {' — '}
                            {entry.foundInDocuments.join(', ')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build and verify visually**

```bash
npm run build
npm run dev
```

Open browser, switch to "Heading Duplicates" tab, paste two texts with `H2: Оплата` in both, click "Перевірити". Expect to see the duplicate listed under H2.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HeadingDuplicatesPage.tsx
git commit -m "feat: implement HeadingDuplicatesPage UI"
```

---

## Task 10: StructureComparePage (Task 2 UI)

**Files:**
- Modify: `src/pages/StructureComparePage.tsx`

- [ ] **Step 1: Replace placeholder with full implementation**

```tsx
import { useState } from 'react';
import { TextBlockInput } from '../components/TextBlockInput';
import { compareStructures } from '../lib/structureCompare';
import { parseDocument } from '../lib/headingParser';
import type { StructureDiff } from '../lib/types';

const MAX_COMPARED = 4;

const LEVEL_DISPLAY: Record<string, string> = {
  h2: 'H2',
  h3: 'H3',
  h4: 'H4',
};

export function StructureComparePage() {
  const [original, setOriginal] = useState('');
  const [compared, setCompared] = useState<string[]>(['']);
  const [diffs, setDiffs] = useState<StructureDiff[] | null>(null);

  const canCompare = original.trim().length > 0 && compared.some((t) => t.trim().length > 0);

  function updateCompared(index: number, value: string) {
    setCompared((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addCompared() {
    if (compared.length < MAX_COMPARED) setCompared((prev) => [...prev, '']);
  }

  function removeCompared(index: number) {
    setCompared((prev) => prev.filter((_, i) => i !== index));
    setDiffs(null);
  }

  function handleCompare() {
    const originalDoc = parseDocument('Оригінал', original);
    const comparedDocs = compared
      .map((t, i) => parseDocument(`Текст ${i + 2}`, t))
      .filter((d) => d.headings.length > 0 || compared[Number(d.label.split(' ')[1]) - 2]?.trim());
    setDiffs(compareStructures(originalDoc, comparedDocs));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <TextBlockInput
          label="Оригінал"
          value={original}
          onChange={setOriginal}
          placeholder="Meta Title: ...\nH1: ...\nH2: ...\nH3: ..."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {compared.map((text, i) => (
          <TextBlockInput
            key={i}
            label={`Текст ${i + 2}`}
            value={text}
            onChange={(v) => updateCompared(i, v)}
            onRemove={compared.length > 1 ? () => removeCompared(i) : undefined}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        {compared.length < MAX_COMPARED && (
          <button
            type="button"
            onClick={addCompared}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            + Додати текст
          </button>
        )}
        <button
          type="button"
          onClick={handleCompare}
          disabled={!canCompare}
          className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Порівняти
        </button>
        {!canCompare && (
          <span className="text-xs text-slate-500">Додайте хоча б 1 текст для порівняння</span>
        )}
      </div>

      {diffs !== null && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {diffs.map((diff) => {
            const noHeadings =
              diff.extra.length === 0 &&
              diff.missing.length === 0 &&
              compared[Number(diff.documentLabel.split(' ')[1]) - 2]?.trim().length === 0;

            if (noHeadings) {
              return (
                <div
                  key={diff.documentLabel}
                  className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  <span className="font-medium">{diff.documentLabel}:</span>{' '}
                  Не знайдено жодного заголовка. Переконайтесь що текст містить нотацію H2:, H3: або завантажте файл.
                </div>
              );
            }

            const isMatch = diff.extra.length === 0 && diff.missing.length === 0;

            return (
              <div
                key={diff.documentLabel}
                className="rounded-md border border-slate-200 bg-white px-4 py-3"
              >
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  {diff.documentLabel}
                </div>

                {isMatch ? (
                  <div className="text-sm text-emerald-700">✓ Структура збігається з оригіналом</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {diff.extra.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium text-amber-700 uppercase tracking-wide">
                          Зайві заголовки (яких немає в оригіналі)
                        </div>
                        <ul className="flex flex-col gap-1">
                          {diff.extra.map((h) => (
                            <li key={h.textLower} className="flex items-baseline gap-2 text-sm">
                              <span className="w-6 shrink-0 rounded bg-amber-100 px-1 text-center text-xs font-mono text-amber-800">
                                {LEVEL_DISPLAY[h.level] ?? h.level.toUpperCase()}
                              </span>
                              <span className="text-slate-800">"{h.text}"</span>
                              <span className="ml-auto rounded bg-amber-200 px-1.5 text-xs font-bold text-amber-900">
                                −
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {diff.missing.length > 0 && (
                      <div>
                        <div className="mb-1 text-xs font-medium text-blue-700 uppercase tracking-wide">
                          Відсутні заголовки (є в оригіналі)
                        </div>
                        <ul className="flex flex-col gap-1">
                          {diff.missing.map((h) => (
                            <li key={h.textLower} className="flex items-baseline gap-2 text-sm">
                              <span className="w-6 shrink-0 rounded bg-blue-100 px-1 text-center text-xs font-mono text-blue-800">
                                {LEVEL_DISPLAY[h.level] ?? h.level.toUpperCase()}
                              </span>
                              <span className="text-slate-800">"{h.text}"</span>
                              <span className="ml-auto rounded bg-blue-200 px-1.5 text-xs font-bold text-blue-900">
                                +
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build and verify visually**

```bash
npm run build
npm run dev
```

Open browser, switch to "Structure Compare". Paste in Оригінал:
```
H2: Оплата
H2: Ігри
```
Paste in Текст 2:
```
H2: Оплата
H3: Картки
H3: Гаманці
H2: Ігри
```
Click "Порівняти". Expect: H3 Картки and H3 Гаманці listed as "Зайві".

- [ ] **Step 3: Run all tests one final time**

```bash
npm run test:run
```

Expected: all tests PASS.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/StructureComparePage.tsx
git commit -m "feat: implement StructureComparePage UI"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ Tab navigation (TabNav.tsx, App.tsx)
- ✓ 1–5 text inputs with add/remove (HeadingDuplicatesPage)
- ✓ File upload (.docx + .html) → fills textarea (TextBlockInput + fileToNotationText)
- ✓ Notation parsing: Meta Title/Description, H1–H4 (parseDocument)
- ✓ Case-insensitive comparison with NFC normalization (headingParser + headingDuplicates + structureCompare)
- ✓ Task 1: duplicate detection per level with list result (findDuplicates + HeadingDuplicatesPage)
- ✓ Task 2: h2–h4 set diff vs original (compareStructures + StructureComparePage)
- ✓ Error handling: unsupported file type, parse failure, disabled button with hints
- ✓ Empty document warning in Structure Compare
- ✓ Original always first block in Task 2, cannot be removed

**Type consistency:** `ParsedHeading`, `ParsedDocument`, `DuplicateEntry`, `StructureDiff` defined in Task 1 and used consistently in Tasks 2–10. `HeadingLevel` used as the key type throughout.
