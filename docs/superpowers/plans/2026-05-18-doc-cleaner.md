# Doc Cleaner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Doc Cleaner" page that accepts a `.docx` file, removes empty paragraphs, clears table cell background colors, and resets Meta title/description line formatting, then downloads the cleaned file.

**Architecture:** Pure browser-side processing — unzip `.docx` with JSZip, manipulate `word/document.xml` via DOMParser, rezip and trigger download. Three independent pure functions operate on a DOM `Document` and are tested directly with jsdom.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, Vitest (jsdom), JSZip

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/lib/docCleaner.ts` | 3 pure XML ops + `cleanDocx` orchestrator |
| Create | `src/lib/__tests__/docCleaner.test.ts` | Unit tests for all 3 operations |
| Create | `src/pages/DocCleanerPage.tsx` | Upload UI + download trigger |
| Modify | `src/components/TabNav.tsx` | Add `'doc-cleaner'` to `Tool` type and `TABS` |
| Modify | `src/App.tsx` | Import and render `DocCleanerPage` |

---

## Task 1: Install JSZip

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install jszip**

```bash
npm install jszip
```

Expected output: `added 1 package` (jszip ships its own TypeScript types)

- [ ] **Step 2: Verify types are available**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jszip dependency"
```

---

## Task 2: Implement `removeEmptyParagraphs` (TDD)

**Files:**
- Create: `src/lib/__tests__/docCleaner.test.ts`
- Create: `src/lib/docCleaner.ts`

- [ ] **Step 1: Create test file with helper and failing tests**

`src/lib/__tests__/docCleaner.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { removeEmptyParagraphs } from '../docCleaner';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function makeDoc(bodyXml: string): Document {
  return new DOMParser().parseFromString(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${bodyXml}</w:body></w:document>`,
    'text/xml',
  );
}

function paragraphCount(doc: Document): number {
  return doc.getElementsByTagName('w:p').length;
}

describe('removeEmptyParagraphs', () => {
  it('removes a paragraph with no w:t', () => {
    const doc = makeDoc('<w:p/><w:p><w:r><w:t>Hello</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('removes a paragraph whose w:t is whitespace only', () => {
    const doc = makeDoc('<w:p><w:r><w:t>   </w:t></w:r></w:p><w:p><w:r><w:t>Text</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('keeps a paragraph that has text', () => {
    const doc = makeDoc('<w:p><w:r><w:t>Content</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('does NOT remove empty paragraphs inside table cells', () => {
    const doc = makeDoc(
      '<w:tbl><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>',
    );
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('removes multiple consecutive empty paragraphs', () => {
    const doc = makeDoc('<w:p/><w:p/><w:p/><w:p><w:r><w:t>OK</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });
});
```

- [ ] **Step 2: Create minimal stub so test file compiles**

`src/lib/docCleaner.ts`:

```typescript
export function removeEmptyParagraphs(_doc: Document): void {}
export function removeTableCellColors(_doc: Document): void {}
export function resetMetaLineFormatting(_doc: Document): void {}
export async function cleanDocx(_buffer: ArrayBuffer): Promise<Blob> {
  return new Blob();
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: tests for `removeEmptyParagraphs` FAIL (stub does nothing)

- [ ] **Step 4: Implement `removeEmptyParagraphs`**

In `src/lib/docCleaner.ts`, replace the stub with:

```typescript
function isInsideTableCell(node: Element): boolean {
  let current = node.parentElement;
  while (current) {
    if (current.tagName === 'w:tc') return true;
    current = current.parentElement;
  }
  return false;
}

export function removeEmptyParagraphs(doc: Document): void {
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    if (isInsideTableCell(p)) continue;
    const texts = Array.from(p.getElementsByTagName('w:t'));
    const hasText = texts.some((t) => t.textContent?.trim());
    if (!hasText) p.parentElement?.removeChild(p);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: all 5 `removeEmptyParagraphs` tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/docCleaner.ts src/lib/__tests__/docCleaner.test.ts
git commit -m "feat: implement removeEmptyParagraphs with tests"
```

---

## Task 3: Implement `removeTableCellColors` (TDD)

**Files:**
- Modify: `src/lib/__tests__/docCleaner.test.ts`
- Modify: `src/lib/docCleaner.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/__tests__/docCleaner.test.ts`:

```typescript
import { removeTableCellColors } from '../docCleaner';

describe('removeTableCellColors', () => {
  it('removes w:shd from w:tcPr', () => {
    const doc = makeDoc(
      `<w:tbl><w:tr><w:tc>
        <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="FF0000"/></w:tcPr>
        <w:p/>
      </w:tc></w:tr></w:tbl>`,
    );
    removeTableCellColors(doc);
    expect(doc.getElementsByTagName('w:shd').length).toBe(0);
  });

  it('leaves cells without w:tcPr unchanged', () => {
    const doc = makeDoc(
      '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Text</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    );
    removeTableCellColors(doc);
    expect(doc.getElementsByTagName('w:tc').length).toBe(1);
  });

  it('removes w:shd from multiple cells', () => {
    const cell = `<w:tc><w:tcPr><w:shd w:val="clear" w:fill="00FF00"/></w:tcPr><w:p/></w:tc>`;
    const doc = makeDoc(`<w:tbl><w:tr>${cell}${cell}</w:tr></w:tbl>`);
    removeTableCellColors(doc);
    expect(doc.getElementsByTagName('w:shd').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: 3 new `removeTableCellColors` tests FAIL

- [ ] **Step 3: Implement `removeTableCellColors`**

In `src/lib/docCleaner.ts`, replace the stub:

```typescript
export function removeTableCellColors(doc: Document): void {
  const cells = Array.from(doc.getElementsByTagName('w:tc'));
  for (const tc of cells) {
    const tcPr = tc.getElementsByTagName('w:tcPr')[0];
    if (!tcPr) continue;
    const shd = tcPr.getElementsByTagName('w:shd')[0];
    if (shd) tcPr.removeChild(shd);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: all 8 tests (5 + 3) PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/docCleaner.ts src/lib/__tests__/docCleaner.test.ts
git commit -m "feat: implement removeTableCellColors with tests"
```

---

## Task 4: Implement `resetMetaLineFormatting` (TDD)

**Files:**
- Modify: `src/lib/__tests__/docCleaner.test.ts`
- Modify: `src/lib/docCleaner.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/__tests__/docCleaner.test.ts`:

```typescript
import { resetMetaLineFormatting } from '../docCleaner';

describe('resetMetaLineFormatting', () => {
  it('removes w:ind from w:pPr of Meta title paragraph', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="720"/></w:pPr>
        <w:r><w:t>Meta title: Тест</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(0);
  });

  it('removes w:b and w:bCs from w:rPr of Meta description paragraph', () => {
    const doc = makeDoc(
      `<w:p>
        <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Meta description: Тест</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:b').length).toBe(0);
    expect(doc.getElementsByTagName('w:bCs').length).toBe(0);
  });

  it('is case-insensitive for the prefix', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="360"/></w:pPr>
        <w:r><w:t>META TITLE: Тест</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(0);
  });

  it('does NOT modify non-meta paragraphs', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="720"/></w:pPr>
        <w:r><w:rPr><w:b/></w:rPr><w:t>H1: Заголовок</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(1);
    expect(doc.getElementsByTagName('w:b').length).toBe(1);
  });

  it('handles paragraph with text split across multiple w:t runs', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="720"/></w:pPr>
        <w:r><w:t xml:space="preserve">Meta title</w:t></w:r>
        <w:r><w:t>: Значення</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: 5 new `resetMetaLineFormatting` tests FAIL

- [ ] **Step 3: Implement `resetMetaLineFormatting`**

In `src/lib/docCleaner.ts`, replace the stub:

```typescript
const META_PREFIXES = ['meta title:', 'meta description:'];

function getParagraphText(p: Element): string {
  return Array.from(p.getElementsByTagName('w:t'))
    .map((t) => t.textContent ?? '')
    .join('')
    .trim()
    .toLowerCase();
}

export function resetMetaLineFormatting(doc: Document): void {
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    const text = getParagraphText(p);
    if (!META_PREFIXES.some((prefix) => text.startsWith(prefix))) continue;

    const pPr = p.getElementsByTagName('w:pPr')[0];
    if (pPr) {
      const ind = pPr.getElementsByTagName('w:ind')[0];
      if (ind) pPr.removeChild(ind);
    }

    for (const rPr of Array.from(p.getElementsByTagName('w:rPr'))) {
      for (const tag of ['w:b', 'w:bCs']) {
        const el = rPr.getElementsByTagName(tag)[0];
        if (el) rPr.removeChild(el);
      }
    }
  }
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: all 13 tests (5 + 3 + 5) PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/docCleaner.ts src/lib/__tests__/docCleaner.test.ts
git commit -m "feat: implement resetMetaLineFormatting with tests"
```

---

## Task 5: Implement `cleanDocx` orchestrator

**Files:**
- Modify: `src/lib/docCleaner.ts`

No unit test needed for `cleanDocx` — it is a thin I/O wrapper over the three already-tested pure functions. Integration is verified manually in Task 7.

- [ ] **Step 1: Add full implementation**

Replace the `cleanDocx` stub in `src/lib/docCleaner.ts` with:

```typescript
import JSZip from 'jszip';

export async function cleanDocx(buffer: ArrayBuffer): Promise<Blob> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('Невалідний .docx файл');
  }

  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('Файл пошкоджений або не підтримується');

  const xmlStr = await xmlFile.async('string');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  removeEmptyParagraphs(doc);
  removeTableCellColors(doc);
  resetMetaLineFormatting(doc);

  const cleanedXml = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', cleanedXml);

  return zip.generateAsync({ type: 'blob' });
}
```

The final `src/lib/docCleaner.ts` should look like this in full:

```typescript
import JSZip from 'jszip';

const META_PREFIXES = ['meta title:', 'meta description:'];

function isInsideTableCell(node: Element): boolean {
  let current = node.parentElement;
  while (current) {
    if (current.tagName === 'w:tc') return true;
    current = current.parentElement;
  }
  return false;
}

function getParagraphText(p: Element): string {
  return Array.from(p.getElementsByTagName('w:t'))
    .map((t) => t.textContent ?? '')
    .join('')
    .trim()
    .toLowerCase();
}

export function removeEmptyParagraphs(doc: Document): void {
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    if (isInsideTableCell(p)) continue;
    const texts = Array.from(p.getElementsByTagName('w:t'));
    const hasText = texts.some((t) => t.textContent?.trim());
    if (!hasText) p.parentElement?.removeChild(p);
  }
}

export function removeTableCellColors(doc: Document): void {
  const cells = Array.from(doc.getElementsByTagName('w:tc'));
  for (const tc of cells) {
    const tcPr = tc.getElementsByTagName('w:tcPr')[0];
    if (!tcPr) continue;
    const shd = tcPr.getElementsByTagName('w:shd')[0];
    if (shd) tcPr.removeChild(shd);
  }
}

export function resetMetaLineFormatting(doc: Document): void {
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    const text = getParagraphText(p);
    if (!META_PREFIXES.some((prefix) => text.startsWith(prefix))) continue;

    const pPr = p.getElementsByTagName('w:pPr')[0];
    if (pPr) {
      const ind = pPr.getElementsByTagName('w:ind')[0];
      if (ind) pPr.removeChild(ind);
    }

    for (const rPr of Array.from(p.getElementsByTagName('w:rPr'))) {
      for (const tag of ['w:b', 'w:bCs']) {
        const el = rPr.getElementsByTagName(tag)[0];
        if (el) rPr.removeChild(el);
      }
    }
  }
}

export async function cleanDocx(buffer: ArrayBuffer): Promise<Blob> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('Невалідний .docx файл');
  }

  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('Файл пошкоджений або не підтримується');

  const xmlStr = await xmlFile.async('string');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  removeEmptyParagraphs(doc);
  removeTableCellColors(doc);
  resetMetaLineFormatting(doc);

  const cleanedXml = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', cleanedXml);

  return zip.generateAsync({ type: 'blob' });
}
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run src/lib/__tests__/docCleaner.test.ts
```

Expected: all 13 tests PASS

- [ ] **Step 3: Run full type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/docCleaner.ts
git commit -m "feat: implement cleanDocx orchestrator"
```

---

## Task 6: Build `DocCleanerPage`

**Files:**
- Create: `src/pages/DocCleanerPage.tsx`

- [ ] **Step 1: Create the page component**

`src/pages/DocCleanerPage.tsx`:

```typescript
import { useRef, useState } from 'react';
import { cleanDocx } from '../lib/docCleaner';

type Status = 'idle' | 'processing' | 'done' | 'error';

export function DocCleanerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    setFile(picked);
    setStatus('idle');
    setErrorMessage('');
  }

  async function handleProcess() {
    if (!file) return;
    setStatus('processing');
    setErrorMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const blob = await cleanDocx(buffer);

      const baseName = file.name.replace(/\.docx$/i, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_cleaned.docx`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Помилка обробки файлу';
      setErrorMessage(msg);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Завантажте .docx файл</h2>

        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition hover:border-slate-400 hover:bg-slate-100"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm text-slate-500">
            {file ? file.name : 'Натисніть або перетягніть файл сюди'}
          </span>
          {file && (
            <span className="text-xs text-slate-400">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleProcess}
            disabled={!file || status === 'processing'}
            className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {status === 'processing' ? 'Обробка…' : 'Обробити та скачати'}
          </button>

          {status === 'done' && (
            <span className="text-sm text-emerald-600">✓ Файл готовий</span>
          )}
        </div>

        {status === 'error' && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/DocCleanerPage.tsx
git commit -m "feat: add DocCleanerPage UI"
```

---

## Task 7: Wire TabNav and App

**Files:**
- Modify: `src/components/TabNav.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `'doc-cleaner'` to TabNav**

In `src/components/TabNav.tsx`, make these two changes:

```typescript
// Change Tool type (line 1):
export type Tool = 'keyword' | 'heading-duplicates' | 'structure-compare' | 'doc-cleaner';

// Add entry to TABS array (after 'structure-compare'):
const TABS: Tab[] = [
  { id: 'keyword', label: 'Keyword Checker' },
  { id: 'heading-duplicates', label: 'Heading Duplicates' },
  { id: 'structure-compare', label: 'Structure Compare' },
  { id: 'doc-cleaner', label: 'Doc Cleaner' },
];
```

- [ ] **Step 2: Register DocCleanerPage in App.tsx**

In `src/App.tsx`, add import and render:

```typescript
// Add import after existing page imports:
import { DocCleanerPage } from './pages/DocCleanerPage';

// Add render inside <main> after the last existing conditional:
{activeTool === 'doc-cleaner' && <DocCleanerPage />}
```

- [ ] **Step 3: Run full type check and all tests**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: no type errors, all tests PASS

- [ ] **Step 4: Start dev server and smoke-test manually**

```bash
npm run dev
```

Open `http://localhost:5173`, click "Doc Cleaner" tab.
- Upload a real `.docx` file → click "Обробити та скачати" → verify `[name]_cleaned.docx` downloads
- Open downloaded file in Word and confirm: empty paragraphs removed, table cell colors cleared, Meta title/description lines have no indentation or bold

- [ ] **Step 5: Commit**

```bash
git add src/components/TabNav.tsx src/App.tsx
git commit -m "feat: wire Doc Cleaner tab into app"
```

---

## Self-Review

**Spec coverage:**
- ✅ Remove empty paragraphs — Task 2
- ✅ Remove table cell background color — Task 3
- ✅ Reset Meta title/description formatting (indent + bold) — Task 4
- ✅ Single file upload — Task 6
- ✅ Download `[name]_cleaned.docx` — Task 6
- ✅ Loading state — Task 6 (`status === 'processing'`)
- ✅ Error messages (3 cases) — Task 5 + Task 6
- ✅ New tab in navigation — Task 7
- ✅ jszip dependency — Task 1

**Type consistency check:**
- `cleanDocx(buffer: ArrayBuffer): Promise<Blob>` — defined Task 5, used Task 6 ✅
- `removeEmptyParagraphs(doc: Document)` — defined Task 2, tested Task 2 ✅
- `removeTableCellColors(doc: Document)` — defined Task 3, tested Task 3 ✅
- `resetMetaLineFormatting(doc: Document)` — defined Task 4, tested Task 4 ✅
- `Tool` union type updated in Task 7 before App.tsx uses it ✅
