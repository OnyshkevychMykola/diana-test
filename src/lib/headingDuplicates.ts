import type { DuplicateEntry, HeadingLevel, ParsedDocument } from './types';

export function findDuplicates(documents: ParsedDocument[]): DuplicateEntry[] {
  const index = new Map<string, { text: string; labels: Set<string> }>();

  for (const doc of documents) {
    const seenInDoc = new Set<string>();
    for (const h of doc.headings) {
      const key = `${h.level}:::${h.textLower}`;
      if (seenInDoc.has(key)) continue;
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
