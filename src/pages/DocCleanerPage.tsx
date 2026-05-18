import { useRef, useState } from 'react';
import { cleanDocx } from '../lib/docCleaner';

type Status = 'idle' | 'processing' | 'done' | 'error';

export function DocCleanerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    setFile(picked);
    setStatus('idle');
    setErrorMessage('');
  }

  async function handleProcess() {
    if (!file) return;
    setStatus('processing');
    setErrorMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const blob = await cleanDocx(buffer);

      const baseName = file.name.replace(/\.docx$/i, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_cleaned.docx`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Помилка обробки файлу';
      setErrorMessage(msg);
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Завантажте .docx файл</h2>

        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 transition hover:border-slate-400 hover:bg-slate-100"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm text-slate-500">
            {file ? file.name : 'Натисніть або перетягніть файл сюди'}
          </span>
          {file && (
            <span className="text-xs text-slate-400">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleProcess}
            disabled={!file || status === 'processing'}
            className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {status === 'processing' ? 'Обробка…' : 'Обробити та скачати'}
          </button>

          {status === 'done' && (
            <span className="text-sm text-emerald-600">✓ Файл готовий</span>
          )}
        </div>

        {status === 'error' && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
