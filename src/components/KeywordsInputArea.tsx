type KeywordsInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

function countNonEmptyLines(value: string): number {
  return value.split('\n').filter((line) => line.trim().length > 0).length;
}

export function KeywordsInputArea({ value, onChange, onSubmit }: KeywordsInputAreaProps) {
  const lineCount = countNonEmptyLines(value);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="keywords-input" className="text-sm font-medium text-slate-700">
        Ключові слова
      </label>
      <textarea
        id="keywords-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'Enter' && onSubmit) onSubmit();
        }}
        placeholder={'kayaking tour - 3\nhiking: 2\nfishing 5\nwhitewater rafting'}
        className="min-h-[400px] resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <div className="flex flex-col gap-1 text-xs text-slate-500">
        <div>Ключів: {lineCount}</div>
        <div className="text-slate-400">
          Формати: <code className="font-mono">word - 3</code>,{' '}
          <code className="font-mono">word: 5</code>, <code className="font-mono">word 2</code>,{' '}
          <code className="font-mono">word</code> (мінімум 1, максимум 2 входження).
        </div>
      </div>
    </div>
  );
}
