import { useCallback, useState } from 'react';
import { TextInputArea } from '../components/TextInputArea';
import { KeywordsInputArea } from '../components/KeywordsInputArea';
import { CheckResultPanel } from '../components/CheckResultPanel';
import { checkKeywords } from '../lib/keywordChecker';
import { parseKeywords } from '../lib/keywordParser';
import type { KeywordResult } from '../lib/types';

export function KeywordCheckerPage() {
  const [text, setText] = useState('');
  const [keywordsRaw, setKeywordsRaw] = useState('');
  const [results, setResults] = useState<KeywordResult[] | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const canCheck = text.trim().length > 0 && keywordsRaw.trim().length > 0;

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    const parsed = parseKeywords(keywordsRaw);
    const next = checkKeywords(text, parsed);
    setResults(next);
    setLastCheckedAt(new Date());
  }, [canCheck, keywordsRaw, text]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TextInputArea value={text} onChange={setText} onSubmit={handleCheck} />
        <KeywordsInputArea value={keywordsRaw} onChange={setKeywordsRaw} onSubmit={handleCheck} />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck}
          className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Перевірити
        </button>
      </div>

      <CheckResultPanel results={results} lastCheckedAt={lastCheckedAt} />
    </div>
  );
}
