function isInsideTableCell(node: Element): boolean {
  let current = node.parentElement;
  while (current) {
    if (current.tagName === 'w:tc') return true;
    current = current.parentElement;
  }
  return false;
}

export function removeEmptyParagraphs(doc: Document): void {
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    if (isInsideTableCell(p)) continue;
    const texts = Array.from(p.getElementsByTagName('w:t'));
    const hasText = texts.some((t) => t.textContent?.trim());
    if (!hasText) p.parentElement?.removeChild(p);
  }
}

export function removeTableCellColors(doc: Document): void {
  const cells = Array.from(doc.getElementsByTagName('w:tc'));
  for (const tc of cells) {
    const tcPr = tc.getElementsByTagName('w:tcPr')[0];
    if (!tcPr) continue;
    const shd = tcPr.getElementsByTagName('w:shd')[0];
    if (shd) tcPr.removeChild(shd);
  }
}

const META_PREFIXES = ['meta title:', 'meta description:'];

function getParagraphText(p: Element): string {
  return Array.from(p.getElementsByTagName('w:t'))
    .map((t) => t.textContent ?? '')
    .join('')
    .trim()
    .toLowerCase();
}

export function resetMetaLineFormatting(doc: Document): void {
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    const text = getParagraphText(p);
    if (!META_PREFIXES.some((prefix) => text.startsWith(prefix))) continue;

    const pPr = p.getElementsByTagName('w:pPr')[0];
    if (pPr) {
      const ind = pPr.getElementsByTagName('w:ind')[0];
      if (ind) pPr.removeChild(ind);
    }

    for (const rPr of Array.from(p.getElementsByTagName('w:rPr'))) {
      for (const tag of ['w:b', 'w:bCs']) {
        const el = rPr.getElementsByTagName(tag)[0];
        if (el) rPr.removeChild(el);
      }
    }
  }
}

export async function cleanDocx(buffer: ArrayBuffer): Promise<Blob> {
  const JSZip = (await import('jszip')).default;

  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('Невалідний .docx файл');
  }

  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('Файл пошкоджений або не підтримується');

  const xmlStr = await xmlFile.async('string');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  removeEmptyParagraphs(doc);
  removeTableCellColors(doc);
  resetMetaLineFormatting(doc);

  const cleanedXml = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', cleanedXml);

  return zip.generateAsync({ type: 'blob' });
}
