# Doc Cleaner — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

## Overview

A new page in the SEO Tools app that accepts a single `.docx` file, applies three formatting cleanup operations, and returns a cleaned `.docx` for download. No backend required — all processing happens in the browser.

## Scope

Three cleanup operations:
1. Remove empty paragraphs (paragraphs with no text content)
2. Remove background color from table cells
3. Reset formatting on Meta title / Meta description lines (remove indentation and bold)

## Architecture

### New files
- `src/pages/DocCleanerPage.tsx` — page component
- `src/lib/docCleaner.ts` — all XML processing logic

### Modified files
- `src/components/TabNav.tsx` — add new tab "Doc Cleaner"
- `src/App.tsx` — register new page and tab type

### New dependency
- `jszip` — unzip/rezip `.docx` in the browser (~90KB gzip)

## UI

Single-file upload page (no preview, no report):
- File drop zone / button — accepts one `.docx`
- Displays selected filename after pick
- "Process & Download" button — enabled only when file is selected
- Loading spinner while processing
- Inline error message for invalid/broken files

## Processing Logic (`docCleaner.ts`)

Input: `ArrayBuffer` of the `.docx` file  
Output: `Blob` of the cleaned `.docx`

**Steps:**
1. `JSZip.loadAsync(buffer)`
2. Read `word/document.xml` as string
3. Parse with `DOMParser`
4. Apply operations 1–3 sequentially
5. Serialize back with `XMLSerializer`
6. `zip.file('word/document.xml', cleanedXml)`
7. `zip.generateAsync({ type: 'blob' })`

### Operation 1 — Remove empty paragraphs

Find all `<w:p>` nodes. Remove any where all `<w:t>` elements are absent or have empty `.textContent` after trim.

### Operation 2 — Remove table cell background color

Find all `<w:tc>` nodes. Inside each `<w:tcPr>`, remove any `<w:shd>` element.

### Operation 3 — Reset Meta line formatting

Find all `<w:p>` nodes where the full text content (after `trim()`) starts with `"Meta title:"` or `"Meta description:"` (case-insensitive).  
For each matching paragraph:
- In `<w:pPr>`: remove `<w:ind>` (indentation)
- In every `<w:rPr>`: remove `<w:b>` and `<w:bCs>` (bold)

## Data Flow

```
User selects .docx
  → FileReader.readAsArrayBuffer()
  → JSZip.loadAsync(buffer)
  → DOMParser.parseFromString(xml)
  → apply 3 operations
  → XMLSerializer.serializeToString(doc)
  → zip.file('word/document.xml', cleanedXml)
  → zip.generateAsync({ type: 'blob' })
  → <a href=blobUrl download="[name]_cleaned.docx"> click
```

Output filename: `[original_name]_cleaned.docx`

## Error Handling

| Condition | Message shown |
|---|---|
| File is not a valid ZIP / .docx | "Невалідний .docx файл" |
| `word/document.xml` missing | "Файл пошкоджений або не підтримується" |
| Any other processing error | "Помилка обробки: [error.message]" |

## Out of Scope

- Multiple file upload
- Preview / diff of changes
- Support for `.doc`, `.html`, or other formats
- Backend processing
