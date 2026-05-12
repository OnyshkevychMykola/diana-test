import type { ParsedDocument, ParsedHeading, StructureDiff, StructureIssue } from './types';

const COMPARED_LEVELS = new Set(['h1', 'h2', 'h3', 'h4']);
const LEVEL_ORDER: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4 };
const STOP_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'for', 'to', 'with', 'by', 'at', 'on', 'is',
  'are', 'was', 'be', 'as', 'та', 'і', 'або', 'в', 'на', 'до', 'з', 'для', 'по', 'від',
]);

// min similarity to consider two headings a match
const MATCH_THRESHOLD = 0.15;
// above this = semantically equivalent (no mismatch reported)
const MEANING_OK_THRESHOLD = 0.5;

function simpleStem(word: string): string {
  return word
    .replace(/ment$|tion$|ness$|ance$|ity$|ing$/, '')
    .replace(/ies$/, 'y')
    .replace(/([a-z])s$/, '$1');
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .replace(/[^\wа-яёіїєa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .map(simpleStem)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function wordJaccard(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function charBigramSim(a: string, b: string): number {
  const bigrams = (s: string) => {
    const result = new Set<string>();
    const str = s.replace(/\s+/g, '');
    for (let i = 0; i < str.length - 1; i++) result.add(str.slice(i, i + 2));
    return result;
  };
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((g) => setB.has(g)).length;
  return (2 * intersection) / (setA.size + setB.size);
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  return Math.max(wordJaccard(a, b), charBigramSim(a, b) * 0.6);
}

function findParent(headings: ParsedHeading[], index: number): ParsedHeading | null {
  const currentLevel = LEVEL_ORDER[headings[index].level] ?? 99;
  for (let i = index - 1; i >= 0; i--) {
    if ((LEVEL_ORDER[headings[i].level] ?? 99) < currentLevel) return headings[i];
  }
  return null;
}

function matchHeadings(originals: ParsedHeading[], compared: ParsedHeading[]): Map<number, number> {
  const pairs: Array<{ origIdx: number; cmpIdx: number; score: number }> = [];

  for (let i = 0; i < originals.length; i++) {
    for (let j = 0; j < compared.length; j++) {
      const score = similarity(originals[i].textLower, compared[j].textLower);
      if (score >= MATCH_THRESHOLD) pairs.push({ origIdx: i, cmpIdx: j, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const usedOrig = new Set<number>();
  const usedCmp = new Set<number>();
  const result = new Map<number, number>(); // origIdx → cmpIdx

  for (const { origIdx, cmpIdx } of pairs) {
    if (!usedOrig.has(origIdx) && !usedCmp.has(cmpIdx)) {
      result.set(origIdx, cmpIdx);
      usedOrig.add(origIdx);
      usedCmp.add(cmpIdx);
    }
  }

  return result;
}

export function compareStructures(
  original: ParsedDocument,
  compared: ParsedDocument[],
): StructureDiff[] {
  const origHeadings = original.headings.filter((h) => COMPARED_LEVELS.has(h.level as string));

  return compared.map((doc) => {
    const cmpHeadings = doc.headings.filter((h) => COMPARED_LEVELS.has(h.level as string));
    const issues: StructureIssue[] = [];
    const matchMap = matchHeadings(origHeadings, cmpHeadings);

    for (let i = 0; i < origHeadings.length; i++) {
      const orig = origHeadings[i];

      if (!matchMap.has(i)) {
        const parent = findParent(origHeadings, i);
        issues.push({
          kind: 'missing',
          originalHeading: orig,
          message: parent
            ? `Missing ${orig.level.toUpperCase()} "${orig.text}" under "${parent.text}"`
            : `Missing ${orig.level.toUpperCase()} "${orig.text}"`,
        });
      } else {
        const cmpIdx = matchMap.get(i)!;
        const cmp = cmpHeadings[cmpIdx];
        const score = similarity(orig.textLower, cmp.textLower);

        if (orig.level !== cmp.level) {
          issues.push({
            kind: 'wrong-level',
            originalHeading: orig,
            comparedHeading: cmp,
            message: `Change heading "${cmp.text}" from ${cmp.level.toUpperCase()} to ${orig.level.toUpperCase()}`,
          });
        }

        if (score < MEANING_OK_THRESHOLD && orig.textLower !== cmp.textLower) {
          issues.push({
            kind: 'meaning-mismatch',
            originalHeading: orig,
            comparedHeading: cmp,
            message: `Heading meaning mismatch: original "${orig.text}" vs new "${cmp.text}"`,
          });
        }
      }
    }

    const matchedCmpIdxs = new Set(matchMap.values());
    for (let j = 0; j < cmpHeadings.length; j++) {
      if (!matchedCmpIdxs.has(j)) {
        const cmp = cmpHeadings[j];
        issues.push({
          kind: 'extra',
          comparedHeading: cmp,
          message: `Remove extra ${cmp.level.toUpperCase()} "${cmp.text}"`,
        });
      }
    }

    // Report headings that appear in the wrong order vs original
    const orderedMatches = [...matchMap.entries()].sort((a, b) => a[0] - b[0]);
    for (let k = 1; k < orderedMatches.length; k++) {
      const [origIdxPrev, cmpIdxPrev] = orderedMatches[k - 1];
      const [origIdxCurr, cmpIdxCurr] = orderedMatches[k];
      if (cmpIdxCurr < cmpIdxPrev) {
        issues.push({
          kind: 'order',
          originalHeading: origHeadings[origIdxCurr],
          message: `Incorrect heading order: "${origHeadings[origIdxCurr].text}" should come after "${origHeadings[origIdxPrev].text}"`,
        });
      }
    }

    return { documentLabel: doc.label, issues };
  });
}
