import { useState } from 'react';
import { TextBlockInput } from '../components/TextBlockInput';
import { findDuplicates } from '../lib/headingDuplicates';
import { parseDocument } from '../lib/headingParser';
import type { DuplicateEntry, HeadingLevel } from '../lib/types';

const MAX_TEXTS = 10;

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

  const nonEmptyCount = texts.filter((t) => t.trim()).length;
  const canCheck = nonEmptyCount >= 2;

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

  const parsedDocs = texts.map((t, i) => parseDocument(`Текст ${i + 1}`, t));
  const presentLevels = new Set(parsedDocs.flatMap((d) => d.headings.map((h) => h.level)));

  const dupsByLevel = new Map<HeadingLevel, DuplicateEntry[]>();
  if (duplicates) {
    for (const entry of duplicates) {
      if (!dupsByLevel.has(entry.level)) dupsByLevel.set(entry.level, []);
      dupsByLevel.get(entry.level)!.push(entry);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
        {texts.length < MAX_TEXTS && (
          <button
            type="button"
            onClick={addText}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            + Додати текст
          </button>
        )}
      </div>

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
