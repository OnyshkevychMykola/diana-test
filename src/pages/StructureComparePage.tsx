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

  const canCompare =
    original.trim().length > 0 && compared.some((t) => t.trim().length > 0);

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
      .filter((_, i) => compared[i].trim().length > 0);
    setDiffs(compareStructures(originalDoc, comparedDocs));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
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
          <span className="text-xs text-slate-500">
            Додайте хоча б 1 текст для порівняння
          </span>
        )}
      </div>

      {diffs !== null && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {diffs.length === 0 && (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Немає текстів для порівняння з розпізнаними заголовками.
            </div>
          )}
          {diffs.map((diff) => {
            const isEmpty = diff.extra.length === 0 && diff.missing.length === 0;

            return (
              <div
                key={diff.documentLabel}
                className="rounded-md border border-slate-200 bg-white px-4 py-4"
              >
                <div className="mb-3 text-sm font-semibold text-slate-800">
                  {diff.documentLabel}
                </div>

                {isEmpty ? (
                  <div className="text-sm text-emerald-700">
                    ✓ Структура збігається з оригіналом
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {diff.extra.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Зайві заголовки (яких немає в оригіналі)
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {diff.extra.map((h) => (
                            <li
                              key={h.textLower}
                              className="flex items-baseline gap-2 text-sm"
                            >
                              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono font-medium text-amber-800">
                                {LEVEL_DISPLAY[h.level] ?? h.level.toUpperCase()}
                              </span>
                              <span className="text-slate-800">"{h.text}"</span>
                              <span className="ml-auto rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                                −
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {diff.missing.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Відсутні заголовки (є в оригіналі)
                        </div>
                        <ul className="flex flex-col gap-1.5">
                          {diff.missing.map((h) => (
                            <li
                              key={h.textLower}
                              className="flex items-baseline gap-2 text-sm"
                            >
                              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-mono font-medium text-blue-800">
                                {LEVEL_DISPLAY[h.level] ?? h.level.toUpperCase()}
                              </span>
                              <span className="text-slate-800">"{h.text}"</span>
                              <span className="ml-auto rounded bg-blue-200 px-1.5 py-0.5 text-xs font-bold text-blue-900">
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
