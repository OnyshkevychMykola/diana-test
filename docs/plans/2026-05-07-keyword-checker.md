# Keyword Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frontend-only SPA для перевірки наявності і кількості ключових слів у тексті: вставити текст + список ключів → побачити які відсутні і яких забагато.

**Architecture:** Vite + React 18 + TypeScript SPA. Уся бізнес-логіка ізольована у `src/lib/` (чисті функції, повний unit-coverage), UI у `src/components/`. Без бекенду, без БД. Деплой статичним білдом на Vercel.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS v3, Vitest, ESLint, Prettier.

**Spec:** `docs/specs/2026-05-07-keyword-checker-design.md`

**Working directory:** усі команди в задачах виконуються з `c:\Users\vitech\Desktop\work\diana-test\` (якщо явно не вказано інше).

**Repo:** `git@github.com:OnyshkevychMykola/diana-test.git`, бранч `main`.

---

## Phase 1: Project Bootstrap

### Task 1: Initialize Vite + React + TS project

**Files:**
- Scaffold у `diana-test/` (поверх існуючих `.git/` і `docs/`)

- [ ] **Step 1: Scaffold Vite project у поточну директорію**

Виконувати з `diana-test/`:

```bash
npm create vite@latest . -- --template react-ts
```

CLI попередить що `Current directory is not empty` — вибрати **`Ignore files and continue`** (зберігає `.git/` і `docs/`).

- [ ] **Step 2: Install base deps**

```bash
npm install
```

Очікувано: `package.json`, `node_modules/`, `vite.config.ts`, `src/App.tsx` з'являються поряд з вже наявною `docs/`.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Очікувано: `Local: http://localhost:5173/` і дефолтна Vite-сторінка відкривається. Зупинити: `Ctrl+C`.

- [ ] **Step 4: Initial commit**

`git` уже ініціалізований клонуванням, тому просто додаємо і комітимо:

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project"
```

---

### Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`
- Modify: `src/index.css`, `src/App.tsx`

- [ ] **Step 1: Install Tailwind + PostCSS**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Це створить `tailwind.config.js` і `postcss.config.js`.

- [ ] **Step 2: Перейменувати config на TS**

Перейменувати `tailwind.config.js` → `tailwind.config.ts` і замінити вміст:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Замінити вміст `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
}
```

- [ ] **Step 4: Замінити `src/App.tsx` smoke-тестом**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-slate-900">Keyword Checker</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Очікувано: на `http://localhost:5173/` сірий фон і чорний заголовок `Keyword Checker`.

- [ ] **Step 6: Видалити дефолтні Vite-артефакти**

Видалити: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`. Прибрати їх імпорти з `App.tsx` (якщо лишилися) і фавікон з `index.html` (або замінити title на `Keyword Checker`).

`index.html` `<title>` має бути: `<title>Keyword Checker</title>`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind CSS and clean default scaffold"
```

---

### Task 3: Add Vitest, ESLint, Prettier

**Files:**
- Create: `vitest.config.ts`, `.prettierrc`, `.prettierignore`
- Modify: `package.json`, `.eslintrc.cjs` (вже є з шаблону)

- [ ] **Step 1: Install testing + formatting deps**

```bash
npm install -D vitest @vitest/coverage-v8 prettier
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
node_modules
dist
coverage
```

- [ ] **Step 5: Update `package.json` scripts**

У секції `"scripts"` має бути:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "lint": "eslint .",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
}
```

- [ ] **Step 6: Verify tooling works**

```bash
npm run lint
npm run test:run
```

Очікувано: lint passes (no files yet → no errors), Vitest каже "no test files found" — це OK на цьому етапі.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add Vitest, Prettier configs and scripts"
```

---

## Phase 2: Core Logic (TDD)

### Task 4: Define types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create `src/lib/types.ts`**

```typescript
export type ParsedKeyword = {
  keyword: string;
  requiredCount?: number;
};

export type KeywordStatus = 'ok' | 'missing' | 'excess';

export type KeywordResult = {
  keyword: string;
  requiredCount?: number;
  actualCount: number;
  status: KeywordStatus;
  delta: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add core domain types for keyword checker"
```

---

### Task 5: Implement `parseKeywords` (TDD)

**Files:**
- Create: `src/lib/keywordParser.ts`, `src/lib/__tests__/keywordParser.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/__tests__/keywordParser.test.ts`**

```typescript
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
    expect(parseKeywords('Tour - 2\ntour - 5')).toEqual([
      { keyword: 'Tour', requiredCount: 5 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run
```

Очікувано: усі тести FAIL з `Cannot find module '../keywordParser'`.

- [ ] **Step 3: Implement `src/lib/keywordParser.ts`**

```typescript
import type { ParsedKeyword } from './types';

const EXPLICIT_SEPARATOR = /^(.+?)\s*[-:]\s*(\d+)\s*$/;
const TRAILING_NUMBER = /^(.+?)\s+(\d+)\s*$/;

function parseLine(line: string): ParsedKeyword | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const explicit = EXPLICIT_SEPARATOR.exec(trimmed);
  if (explicit) {
    return { keyword: explicit[1].trim(), requiredCount: Number(explicit[2]) };
  }

  const trailing = TRAILING_NUMBER.exec(trimmed);
  if (trailing) {
    return { keyword: trailing[1].trim(), requiredCount: Number(trailing[2]) };
  }

  return { keyword: trimmed };
}

export function parseKeywords(raw: string): ParsedKeyword[] {
  const seen = new Map<string, ParsedKeyword>();

  for (const line of raw.split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const key = parsed.keyword.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, parsed);
      continue;
    }

    const existingCount = existing.requiredCount ?? -1;
    const newCount = parsed.requiredCount ?? -1;
    if (newCount > existingCount) {
      seen.set(key, { ...existing, requiredCount: parsed.requiredCount });
    }
  }

  return Array.from(seen.values());
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm run test:run
```

Очікувано: усі 12 тестів PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement keyword parser with multi-format and dedup support"
```

---

### Task 6: Implement `checkKeywords` — matching engine (TDD)

**Files:**
- Create: `src/lib/keywordChecker.ts`, `src/lib/__tests__/keywordChecker.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/__tests__/keywordChecker.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run
```

Очікувано: усі тести FAIL (`Cannot find module '../keywordChecker'`).

- [ ] **Step 3: Implement `src/lib/keywordChecker.ts`**

```typescript
import type { KeywordResult, ParsedKeyword } from './types';

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const UNDEFINED_EXCESS_THRESHOLD = 2;

function escapeRegex(input: string): string {
  return input.replace(REGEX_SPECIAL, '\\$&');
}

function buildKeywordRegex(rawKeyword: string): RegExp {
  const normalized = rawKeyword.normalize('NFC').trim();
  const tokens = normalized.split(/\s+/).map(escapeRegex);
  const body = tokens.join('\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, 'giu');
}

function countMatches(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function classify(actual: number, requiredCount: number | undefined): {
  status: KeywordResult['status'];
  delta: number;
} {
  if (requiredCount === undefined) {
    if (actual === 0) return { status: 'missing', delta: 1 };
    if (actual > UNDEFINED_EXCESS_THRESHOLD) {
      return { status: 'excess', delta: actual - UNDEFINED_EXCESS_THRESHOLD };
    }
    return { status: 'ok', delta: 0 };
  }

  if (actual < requiredCount) return { status: 'missing', delta: requiredCount - actual };
  if (actual > requiredCount) return { status: 'excess', delta: actual - requiredCount };
  return { status: 'ok', delta: 0 };
}

export function checkKeywords(rawText: string, keywords: ParsedKeyword[]): KeywordResult[] {
  const text = rawText.normalize('NFC');
  return keywords.map((kw) => {
    const regex = buildKeywordRegex(kw.keyword);
    const actualCount = countMatches(text, regex);
    const { status, delta } = classify(actualCount, kw.requiredCount);
    return {
      keyword: kw.keyword,
      requiredCount: kw.requiredCount,
      actualCount,
      status,
      delta,
    };
  });
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm run test:run
```

Очікувано: усі тести PASS.

- [ ] **Step 5: Verify coverage**

```bash
npm run test:coverage
```

Очікувано: `src/lib/` має ≥ 90% покриття. Якщо ні — додати тести для непокритих гілок.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: implement Unicode-aware keyword checker with classification"
```

---

## Phase 3: UI

### Task 7: TextInputArea component

**Files:**
- Create: `src/components/TextInputArea.tsx`

- [ ] **Step 1: Create `src/components/TextInputArea.tsx`**

```tsx
type TextInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function TextInputArea({ value, onChange, onSubmit }: TextInputAreaProps) {
  const wordCount = countWords(value);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="text-input" className="text-sm font-medium text-slate-700">
        Текст
      </label>
      <textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'Enter' && onSubmit) onSubmit();
        }}
        placeholder="Вставте сюди текст для перевірки..."
        className="min-h-[400px] resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <div className="text-xs text-slate-500">Слів: {wordCount.toLocaleString('uk-UA')}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add TextInputArea component with word counter"
```

---

### Task 8: KeywordsInputArea component

**Files:**
- Create: `src/components/KeywordsInputArea.tsx`

- [ ] **Step 1: Create `src/components/KeywordsInputArea.tsx`**

```tsx
type KeywordsInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

function countNonEmptyLines(value: string): number {
  return value.split('\n').filter((line) => line.trim().length > 0).length;
}

export function KeywordsInputArea({ value, onChange, onSubmit }: KeywordsInputAreaProps) {
  const lineCount = countNonEmptyLines(value);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="keywords-input" className="text-sm font-medium text-slate-700">
        Ключові слова
      </label>
      <textarea
        id="keywords-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'Enter' && onSubmit) onSubmit();
        }}
        placeholder={'kayaking tour - 3\nhiking: 2\nfishing 5\nwhitewater rafting'}
        className="min-h-[400px] resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <div className="flex flex-col gap-1 text-xs text-slate-500">
        <div>Ключів: {lineCount}</div>
        <div className="text-slate-400">
          Формати: <code className="font-mono">word - 3</code>,{' '}
          <code className="font-mono">word: 5</code>, <code className="font-mono">word 2</code>,{' '}
          <code className="font-mono">word</code> (мінімум 1, максимум 2 входження).
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add KeywordsInputArea component with format hint"
```

---

### Task 9: KeywordResultRow component

**Files:**
- Create: `src/components/KeywordResultRow.tsx`

- [ ] **Step 1: Create `src/components/KeywordResultRow.tsx`**

```tsx
import type { KeywordResult } from '../lib/types';

type KeywordResultRowProps = {
  result: KeywordResult;
};

function formatLabel(result: KeywordResult): string {
  if (result.status === 'missing') return `треба ще ${result.delta}`;
  if (result.status === 'excess') return `на ${result.delta} більше`;
  return '';
}

function formatCounter(result: KeywordResult): string {
  const denominator = result.requiredCount ?? (result.status === 'excess' ? 2 : 1);
  return `${result.actualCount}/${denominator}`;
}

export function KeywordResultRow({ result }: KeywordResultRowProps) {
  const dotClass = result.status === 'missing' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-900">{result.keyword}</span>
        <span className="text-xs text-slate-500">
          {formatLabel(result)} ({formatCounter(result)})
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add KeywordResultRow component"
```

---

### Task 10: CheckResultPanel component

**Files:**
- Create: `src/components/CheckResultPanel.tsx`

- [ ] **Step 1: Create `src/components/CheckResultPanel.tsx`**

```tsx
import type { KeywordResult } from '../lib/types';
import { KeywordResultRow } from './KeywordResultRow';

type CheckResultPanelProps = {
  results: KeywordResult[] | null;
  lastCheckedAt: Date | null;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('uk-UA', { hour12: false });
}

export function CheckResultPanel({ results, lastCheckedAt }: CheckResultPanelProps) {
  if (!results) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Натисніть «Перевірити», щоб побачити результат.
      </div>
    );
  }

  const missing = results
    .filter((r) => r.status === 'missing')
    .sort((a, b) => b.delta - a.delta);
  const excess = results.filter((r) => r.status === 'excess').sort((a, b) => b.delta - a.delta);
  const okCount = results.filter((r) => r.status === 'ok').length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
        {lastCheckedAt && (
          <span className="text-xs text-slate-500">
            Перевірено о {formatTime(lastCheckedAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-red-600">
            Не вистачає ({missing.length})
          </h3>
          {missing.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              Усі ключі присутні в потрібній кількості.
            </div>
          ) : (
            missing.map((r) => <KeywordResultRow key={`m-${r.keyword}`} result={r} />)
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-amber-600">
            Забагато ({excess.length})
          </h3>
          {excess.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              Жоден ключ не перевищує ліміт.
            </div>
          ) : (
            excess.map((r) => <KeywordResultRow key={`e-${r.keyword}`} result={r} />)
          )}
        </div>
      </div>

      <div className="text-sm text-emerald-700">✓ {okCount} ключів у нормі</div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add CheckResultPanel with missing/excess columns"
```

---

### Task 11: Compose App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { TextInputArea } from './components/TextInputArea';
import { KeywordsInputArea } from './components/KeywordsInputArea';
import { CheckResultPanel } from './components/CheckResultPanel';
import { checkKeywords } from './lib/keywordChecker';
import { parseKeywords } from './lib/keywordParser';
import type { KeywordResult } from './lib/types';

function App() {
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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">Keyword Checker</h1>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TextInputArea value={text} onChange={setText} onSubmit={handleCheck} />
          <KeywordsInputArea
            value={keywordsRaw}
            onChange={setKeywordsRaw}
            onSubmit={handleCheck}
          />
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
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Run dev server and smoke-test**

```bash
npm run dev
```

Тестовий сценарій вручну:
1. Вставити у поле `Текст`: `I love kayaking tour and walking tour and tour packages. Hiking is fun.`
2. Вставити у поле `Ключові слова`:
   ```
   tour - 3
   kayaking tour
   hiking
   fishing
   ```
3. Натиснути `Перевірити`.

Очікувано:
- `Не вистачає (1)`: `fishing` (треба ще 1 (0/1))
- `Забагато (0)`: `Жоден ключ не перевищує ліміт.`
- `✓ 3 ключів у нормі` (`tour`, `kayaking tour`, `hiking`)

- [ ] **Step 3: Run lint + tests**

```bash
npm run lint
npm run test:run
```

Очікувано: lint passes, tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: compose App with state, button and Ctrl+Enter shortcut"
```

---

## Phase 4: Polish & Deploy

### Task 12: Production build verification

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: Build production bundle**

```bash
npm run build
```

Очікувано: `dist/` створена без помилок TypeScript.

- [ ] **Step 2: Preview production build**

```bash
npm run preview
```

Відкрити URL який покаже Vite (зазвичай `http://localhost:4173/`) і повторити smoke-сценарій з Task 11.

- [ ] **Step 3: Перевірити mobile-режим у DevTools**

У Chrome DevTools перемкнутись у responsive mode (~ 375px width). Колонки мають складатись у стовпчик; усі контроли клікабельні; результат читабельний.

- [ ] **Step 4: Commit (якщо щось виправили)**

Якщо нічого не міняли — пропустити.

---

### Task 13: README + Vercel config

**Files:**
- Create: `README.md`, `vercel.json`
- Modify: `.gitignore` (переконатися що `dist/`, `coverage/`, `.DS_Store` ігноруються)

- [ ] **Step 1: Create `README.md`**

````markdown
# Keyword Checker

Невеликий вебінструмент для перевірки наявності і кількості ключових слів у тексті.

## Use case

1. Вставити текст (1000–7000 слів).
2. Вставити список ключових слів — по одному на рядок. Опційно вказати очікувану кількість входжень через `-`, `:` або просто пробіл:
   ```
   kayaking tour - 3
   hiking: 2
   fishing 5
   whitewater rafting
   ```
3. Натиснути `Перевірити`. Побачити які ключі відсутні і яких забагато.

**Правила:**
- Без вказаної кількості: ключ має зустрічатись 1 або 2 рази (інакше missing/excess).
- З вказаною кількістю N: рівно N (інакше missing/excess).
- Пошук case-insensitive, по межах слова, з підтримкою кирилиці.

## Local development

```bash
npm install
npm run dev          # dev server
npm run test         # vitest watch mode
npm run test:run     # one-shot
npm run test:coverage
npm run build        # production build
npm run preview      # preview production build
npm run lint
npm run format
```

## Deploy

Push to GitHub → import у Vercel → автодетект Vite. Жодних env vars.

## Architecture

- Pure frontend SPA: Vite + React 18 + TypeScript + Tailwind.
- Бізнес-логіка ізольована у `src/lib/` з повним unit-coverage.
- UI у `src/components/`.

Дизайн-спека: `docs/specs/2026-05-07-keyword-checker-design.md`
План реалізації: `docs/plans/2026-05-07-keyword-checker.md`
````

- [ ] **Step 2: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 3: Verify `.gitignore` covers all artifacts**

`.gitignore` (вже згенерований шаблоном Vite) має містити мінімум:

```
node_modules
dist
coverage
.DS_Store
*.local
```

Якщо `coverage` відсутній — додати.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "docs: add README and Vercel SPA rewrite config"
```

---

### Task 14: Final verification

**Files:**
- (verification only)

- [ ] **Step 1: Run full quality gate**

```bash
npm run lint
npm run test:coverage
npm run build
```

Очікувано:
- Lint: 0 errors, 0 warnings.
- Tests: усі pass, coverage `src/lib/` ≥ 90%.
- Build: success без TypeScript-помилок.

- [ ] **Step 2: Manual smoke test on prod build**

```bash
npm run preview
```

Сценарій:
1. Текст: великий абзац ~3000 слів (можна згенерувати lorem або взяти статтю).
2. Ключі (10–15 штук, mix форматів і кирилиці).
3. `Перевірити` — результат з'являється миттєво.
4. Редагувати текст — результат не зникає до наступного `Перевірити`.
5. `Ctrl+Enter` у textarea — теж тригерить перевірку.

- [ ] **Step 3: Перевірити що дерево чисте**

```bash
git status
```

Очікувано: `working tree clean`.

---

## Self-Review Checklist (post-plan)

Цей чекліст автор плану виконує сам, інлайн поправляє знайдене.

**1. Spec coverage:**
- ✅ FR 2.1 (Inputs / парсинг) → Task 5 (parser tests + impl).
- ✅ FR 2.2 (Matching rules / Unicode boundaries / multi-word / overlap) → Task 6 (checker).
- ✅ FR 2.3 (Classification table) → Task 6 (classify function).
- ✅ FR 2.4 (Output) → Tasks 9, 10 (Row + Panel).
- ✅ NFR 3 (performance, mobile, accessibility) → Task 12 (build/preview verify).
- ✅ Architecture (стек, структура) → Tasks 1, 2, 3.
- ✅ UI Design → Tasks 7–11.
- ✅ Edge Cases (escape, NFC, hyphens) → Task 6 tests.
- ✅ Testing strategy (≥90%, no UI tests у v1) → Task 6 + coverage threshold.
- ✅ Deployment → Tasks 13, 14.
- ✅ Local DX scripts → Task 3.

**2. Placeholder scan:** жодних TBD/TODO/`implement later`.

**3. Type consistency:**
- `ParsedKeyword`, `KeywordResult`, `KeywordStatus` визначені у Task 4 і вживаються однаково у Tasks 5, 6, 9, 10, 11.
- `parseKeywords(raw: string): ParsedKeyword[]` — однакова сигнатура у Task 5 і App (Task 11).
- `checkKeywords(text: string, keywords: ParsedKeyword[]): KeywordResult[]` — однакова у Task 6 і App.
