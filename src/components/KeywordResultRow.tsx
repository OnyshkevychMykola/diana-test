import type { KeywordResult } from '../lib/types';

type KeywordResultRowProps = {
  result: KeywordResult;
};

function formatLabel(result: KeywordResult): string {
  if (result.status === 'missing') return `треба ще ${result.delta}`;
  if (result.status === 'excess') return `на ${result.delta} більше`;
  return '';
}

function formatCounter(result: KeywordResult): string {
  const denominator = result.requiredCount ?? (result.status === 'excess' ? 2 : 1);
  return `${result.actualCount}/${denominator}`;
}

export function KeywordResultRow({ result }: KeywordResultRowProps) {
  const dotClass = result.status === 'missing' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-900">{result.keyword}</span>
        <span className="text-xs text-slate-500">
          {formatLabel(result)} ({formatCounter(result)})
        </span>
      </div>
    </div>
  );
}
