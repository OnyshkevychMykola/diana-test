type TextInputAreaProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function TextInputArea({ value, onChange, onSubmit }: TextInputAreaProps) {
  const wordCount = countWords(value);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="text-input" className="text-sm font-medium text-slate-700">
        Текст
      </label>
      <textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'Enter' && onSubmit) onSubmit();
        }}
        placeholder="Вставте сюди текст для перевірки..."
        className="min-h-[400px] resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <div className="text-xs text-slate-500">Слів: {wordCount.toLocaleString('uk-UA')}</div>
    </div>
  );
}
