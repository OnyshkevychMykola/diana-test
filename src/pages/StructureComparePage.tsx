import { useState } from 'react';
import { TextBlockInput } from '../components/TextBlockInput';
import { compareStructures } from '../lib/structureCompare';
import { parseDocument } from '../lib/headingParser';
import type { IssueKind, StructureDiff } from '../lib/types';

const MAX_COMPARED = 4;

const ISSUE_STYLE: Record<IssueKind, { badge: string; label: string }> = {
  missing: { badge: 'bg-blue-100 text-blue-800', label: 'Missing' },
  extra: { badge: 'bg-amber-100 text-amber-800', label: 'Extra' },
  'wrong-level': { badge: 'bg-red-100 text-red-800', label: 'Wrong level' },
  'meaning-mismatch': { badge: 'bg-purple-100 text-purple-800', label: 'Meaning' },
  order: { badge: 'bg-slate-100 text-slate-600', label: 'Order' },
};

export function StructureComparePage() {
  const [original, setOriginal] = useState('');
  const [compared, setCompared] = useState<string[]>(['']);
  const [diffs, setDiffs] = useState<StructureDiff[] | null>(null);
  const [showMeaning, setShowMeaning] = useState(false);

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
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showMeaning}
            onChange={(e) => setShowMeaning(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-slate-700"
          />
          Show Meaning
        </label>
      </div>

      {diffs !== null && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {diffs.length === 0 && (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Немає текстів для порівняння з розпізнаними заголовками.
            </div>
          )}
          {diffs.map((diff) => (
            <div
              key={diff.documentLabel}
              className="rounded-md border border-slate-200 bg-white px-4 py-4"
            >
              <div className="mb-3 text-sm font-semibold text-slate-800">
                {diff.documentLabel}
              </div>

              {diff.issues.filter((issue) => showMeaning || issue.kind !== 'meaning-mismatch').length === 0 ? (
                <div className="text-sm text-emerald-700">
                  ✓ Структура збігається з оригіналом
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {diff.issues
                    .filter((issue) => showMeaning || issue.kind !== 'meaning-mismatch')
                    .map((issue, idx) => {
                      const style = ISSUE_STYLE[issue.kind];
                      return (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span
                            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${style.badge}`}
                          >
                            {style.label}
                          </span>
                          <span className="text-slate-700">{issue.message}</span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
