import { useRef, useState } from 'react';
import { fileToNotationText } from '../lib/headingParser';

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'html' && ext !== 'htm') {
      setFileError('Підтримуються лише .docx та .html файли');
      e.target.value = '';
      return;
    }

    setFileError(null);
    setIsLoading(true);
    try {
      const notation = await fileToNotationText(file);
      onChange(notation);
    } catch {
      setFileError('Не вдалось обробити файл. Спробуйте інший формат');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isLoading ? 'Завантаження…' : 'Завантажити файл'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.html,.htm"
            className="hidden"
            onChange={handleFile}
          />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Видалити блок"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Meta Title: ...\nH1: ...\nH2: ...'}
        rows={8}
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
      />

      {fileError && <p className="text-xs text-red-600">{fileError}</p>}
    </div>
  );
}
