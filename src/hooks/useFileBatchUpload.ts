import { useRef, useState } from 'react';
import { fileToNotationText } from '../lib/headingParser';

interface UseFileBatchUploadOptions {
  maxFiles: number;
  onFiles: (texts: string[]) => void;
}

export function useFileBatchUpload({ maxFiles, onFiles }: UseFileBatchUploadOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function triggerUpload() {
    fileInputRef.current?.click();
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? []);
    e.target.value = '';

    if (!raw.length) return;

    const files = raw.slice(0, maxFiles);
    setUploadErrors([]);
    setIsLoading(true);

    const results = await Promise.allSettled(files.map(fileToNotationText));

    const texts: string[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        texts.push(result.value);
      } else {
        errors.push(files[i].name);
      }
    });

    setIsLoading(false);

    if (errors.length) setUploadErrors(errors);
    if (texts.length) onFiles(texts);
  }

  return { isLoading, uploadErrors, fileInputRef, triggerUpload, handleFiles };
}
