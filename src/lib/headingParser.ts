import type { HeadingLevel, ParsedDocument, ParsedHeading } from './types';

const NOTATION_PATTERN = /^(meta\s+title|meta\s+description|h[1-4])\s*:\s*(.+)$/i;

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

export async function fileToNotationText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'html' || ext === 'htm') {
    const text = await file.text();
    return htmlToNotationText(text);
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const buffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const docxNotation = htmlToNotationText(htmlResult.value);

    const rawResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    const metaLines = rawResult.value
      .split('\n')
      .filter((line) => /^(meta\s+title|meta\s+description)\s*:/i.test(line.trim()))
      .map((line) => line.trim());

    const nonMetaLines = docxNotation
      .split('\n')
      .filter((l) => l && !l.toLowerCase().startsWith('meta'));

    return [...metaLines, ...nonMetaLines].join('\n');
  }

  throw new Error('unsupported-type');
}
