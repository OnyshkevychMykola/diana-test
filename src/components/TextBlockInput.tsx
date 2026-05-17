interface TextBlockInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  placeholder?: string;
}

export function TextBlockInput({
  label,
  value,
  onChange,
  onRemove,
  placeholder,
}: TextBlockInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Remove block"
          >
            ✕
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Meta Title: ...\nH1: ...\nH2: ...'}
        rows={8}
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}
