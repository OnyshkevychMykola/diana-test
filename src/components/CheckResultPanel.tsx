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

  const missing = results.filter((r) => r.status === 'missing').sort((a, b) => b.delta - a.delta);
  const excess = results.filter((r) => r.status === 'excess').sort((a, b) => b.delta - a.delta);
  const okCount = results.filter((r) => r.status === 'ok').length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
        {lastCheckedAt && (
          <span className="text-xs text-slate-500">Перевірено о {formatTime(lastCheckedAt)}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-red-600">Не вистачає ({missing.length})</h3>
          {missing.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              Усі ключі присутні в потрібній кількості.
            </div>
          ) : (
            missing.map((r) => <KeywordResultRow key={`m-${r.keyword}`} result={r} />)
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-amber-600">Забагато ({excess.length})</h3>
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
