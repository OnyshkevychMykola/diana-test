import type { ParsedDocument, ParsedHeading, StructureDiff } from './types';

const COMPARED_LEVELS = new Set(['h2', 'h3', 'h4']);

function toUniqueSet(doc: ParsedDocument): Map<string, ParsedHeading> {
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
  const originalSet = toUniqueSet(original);

  return compared.map((doc) => {
    const docSet = toUniqueSet(doc);
    const extra = [...docSet.values()].filter((h) => !originalSet.has(h.textLower));
    const missing = [...originalSet.values()].filter((h) => !docSet.has(h.textLower));
    return { documentLabel: doc.label, extra, missing };
  });
}
