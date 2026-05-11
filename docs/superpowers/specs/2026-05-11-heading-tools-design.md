# Heading Tools — Design Spec

**Date:** 2026-05-11  
**Project:** diana-test (Vite + React 19 + TypeScript + Tailwind)  
**Scope:** Two new tools added alongside the existing Keyword Checker

---

## Overview

Add two new SEO analysis tools to the application:

1. **Heading Duplicates** — paste 1–5 texts, find identical h1–h4 headings and meta tags across them
2. **Structure Compare** — paste 1 original + 1–4 comparison texts, show how h2–h4 structure differs from the original

Navigation between all three tools (Keyword Checker, Heading Duplicates, Structure Compare) is handled by a tab switcher in the header.

---

## Architecture

### Approach: Tab state in `App.tsx` (no router)

`App.tsx` holds `activeTool: 'keyword' | 'heading-duplicates' | 'structure-compare'` state. The header renders `TabNav` with three tabs. Each tab mounts its own page component. No new routing dependency needed.

### New file structure

```
src/
  components/
    TabNav.tsx                      ← tab switcher in header
  pages/
    KeywordCheckerPage.tsx          ← existing App logic moved here
    HeadingDuplicatesPage.tsx       ← Task 1
    StructureComparePage.tsx        ← Task 2
  lib/
    headingParser.ts                ← shared parser (notation + HTML + DOCX)
    headingDuplicates.ts            ← duplicate detection logic
    structureCompare.ts             ← structure diff logic
    types.ts                        ← extended with heading types
```

New dependency: `mammoth` (DOCX → HTML conversion, client-side).

---

## Input Handling

Each text is entered in a dedicated block labeled "Текст 1", "Текст 2", etc.

- **Task 1:** 1–5 blocks, all equal. "+ Додати текст" button (max 5), "✕" to remove.
- **Task 2:** First block is always labeled "Оригінал" and cannot be removed. 1–4 additional blocks.

Each block contains:
- A `textarea` for manual text input
- A "Завантажити файл" button accepting `.docx` or `.html`

When a file is uploaded, it is parsed and the result is written into the textarea — the user can see and edit the extracted content before running analysis.

### Text notation format (manual input)

```
Meta Title: Назва сторінки
Meta Description: Опис сторінки
H1: Заголовок першого рівня
H2: Розділ
H3: Підрозділ
H4: Деталь
```

Rules:
- Prefix is case-insensitive (`h2:`, `H2:`, `H2 :` are all valid)
- Everything after the colon and optional whitespace is the heading text
- Lines not matching any pattern are ignored

---

## Shared Parser (`headingParser.ts`)

Parses a raw string into a `ParsedDocument`.

```ts
type HeadingLevel = 'meta-title' | 'meta-description' | 'h1' | 'h2' | 'h3' | 'h4';

interface ParsedHeading {
  level: HeadingLevel;
  text: string;       // trimmed original
  textLower: string;  // NFC-normalized, lowercased — used for comparisons
}

interface ParsedDocument {
  label: string;           // "Текст 1", "Оригінал", etc.
  headings: ParsedHeading[];
}
```

**Parsing flow:**
1. If input came from file upload:
   - `.docx` → `mammoth.convertToHtml()` → HTML string
   - `.html` → use as-is
   - `DOMParser` extracts `h1`–`h4` tag text → mapped to `ParsedHeading[]`
   - Meta Title / Meta Description are then searched in the raw document text using the same line notation
2. If input is plain text (textarea) → line-by-line regex matching against `H1:`–`H4:`, `Meta Title:`, `Meta Description:`

**Normalization:** `String.normalize('NFC').toLowerCase().trim()` applied to all heading text before comparison (consistent with existing `keywordChecker.ts`).

---

## Task 1 — Heading Duplicates (`headingDuplicates.ts`)

### Logic

For every unique `textLower` across all documents, if it appears in 2+ documents → duplicate.
Checked separately per level: `meta-title`, `meta-description`, `h1`, `h2`, `h3`, `h4`.

```ts
interface DuplicateEntry {
  level: HeadingLevel;
  text: string;               // display text (from first occurrence)
  foundInDocuments: string[]; // e.g. ["Текст 1", "Текст 3"]
}
```

### UI

**No duplicates:** green "Ідентичних заголовків не знайдено."

**With duplicates:** grouped by level:

```
⚠ Meta Title (1 дублікат)
  "Найкраще казино України" — Текст 1, Текст 3

⚠ H2 (2 дублікати)
  "Методи оплати" — Текст 1, Текст 2, Текст 4

✓ H1 — дублікатів немає
✓ H3 — дублікатів немає
✓ H4 — дублікатів немає
✓ Meta Description — дублікатів немає
```

- Levels with duplicates: orange/yellow warning style
- Levels without duplicates: green checkmark, still shown for completeness
- Only levels present in at least one document are shown

---

## Task 2 — Structure Compare (`structureCompare.ts`)

### Logic

Compares `h2`–`h4` only (meta and h1 excluded). Comparison is by **unique heading set** — order and count of occurrences are not considered.

```ts
interface StructureDiff {
  documentLabel: string;
  extra: ParsedHeading[];    // in this doc but not in original
  missing: ParsedHeading[];  // in original but not in this doc
}
```

### UI

One block per comparison document:

```
── Текст 2 ──────────────────────────
  Зайві заголовки (яких немає в оригіналі):
    H3  "Кредитні картки"         [−]
    H3  "Електронні гаманці"      [−]

  Відсутні заголовки (є в оригіналі):
    H2  "Бонуси для нових гравців" [+]

── Текст 3 ──────────────────────────
  ✓ Структура збігається з оригіналом
```

- Extra headings: orange, `−` badge
- Missing headings: blue, `+` badge
- Matching structure: green checkmark

**Empty document warning:** if a document has no recognized headings at all, show: "Не знайдено жодного заголовка. Переконайтесь що текст містить нотацію H2:, H3: або завантажте файл."

---

## Error Handling

| Situation | Behaviour |
|---|---|
| Unsupported file type uploaded | Inline error under the file button: "Підтримуються лише .docx та .html файли" |
| File parsing fails (corrupt DOCX) | Inline error: "Не вдалось обробити файл. Спробуйте інший формат" |
| Fewer than 2 texts in Task 1 | "Перевірити" button disabled with hint: "Додайте щонайменше 2 тексти" |
| Only original, no comparison texts in Task 2 | "Порівняти" button disabled with hint: "Додайте хоча б 1 текст для порівняння" |
| All texts empty | Button disabled |

---

## Out of Scope

- Saving/exporting results (no CSV, PDF, clipboard copy)
- Persistent state across page reloads
- User-defined document labels (always "Текст N" / "Оригінал")
- Heading order comparison in Task 2 (only set difference, not sequence)
- H1 comparison in Task 2 (h2–h4 only per requirements)
