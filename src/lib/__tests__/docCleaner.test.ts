// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { removeEmptyParagraphs, removeTableCellColors, resetMetaLineFormatting } from '../docCleaner';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function makeDoc(bodyXml: string): Document {
  return new DOMParser().parseFromString(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${bodyXml}</w:body></w:document>`,
    'text/xml',
  );
}

function paragraphCount(doc: Document): number {
  return doc.getElementsByTagName('w:p').length;
}

describe('removeEmptyParagraphs', () => {
  it('removes a paragraph with no w:t', () => {
    const doc = makeDoc('<w:p/><w:p><w:r><w:t>Hello</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('removes a paragraph whose w:t is whitespace only', () => {
    const doc = makeDoc('<w:p><w:r><w:t>   </w:t></w:r></w:p><w:p><w:r><w:t>Text</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('keeps a paragraph that has text', () => {
    const doc = makeDoc('<w:p><w:r><w:t>Content</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('does NOT remove empty paragraphs inside table cells', () => {
    const doc = makeDoc('<w:tbl><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });

  it('removes multiple consecutive empty paragraphs', () => {
    const doc = makeDoc('<w:p/><w:p/><w:p/><w:p><w:r><w:t>OK</w:t></w:r></w:p>');
    removeEmptyParagraphs(doc);
    expect(paragraphCount(doc)).toBe(1);
  });
});

describe('removeTableCellColors', () => {
  it('removes w:shd from w:tcPr', () => {
    const doc = makeDoc(
      `<w:tbl><w:tr><w:tc>
        <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="FF0000"/></w:tcPr>
        <w:p/>
      </w:tc></w:tr></w:tbl>`,
    );
    removeTableCellColors(doc);
    expect(doc.getElementsByTagName('w:shd').length).toBe(0);
  });

  it('leaves cells without w:tcPr unchanged', () => {
    const doc = makeDoc(
      '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Text</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
    );
    removeTableCellColors(doc);
    expect(doc.getElementsByTagName('w:tc').length).toBe(1);
  });

  it('removes w:shd from multiple cells', () => {
    const cell = `<w:tc><w:tcPr><w:shd w:val="clear" w:fill="00FF00"/></w:tcPr><w:p/></w:tc>`;
    const doc = makeDoc(`<w:tbl><w:tr>${cell}${cell}</w:tr></w:tbl>`);
    removeTableCellColors(doc);
    expect(doc.getElementsByTagName('w:shd').length).toBe(0);
  });
});

describe('resetMetaLineFormatting', () => {
  it('removes w:ind from w:pPr of Meta title paragraph', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="720"/></w:pPr>
        <w:r><w:t>Meta title: Тест</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(0);
  });

  it('removes w:b and w:bCs from w:rPr of Meta description paragraph', () => {
    const doc = makeDoc(
      `<w:p>
        <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Meta description: Тест</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:b').length).toBe(0);
    expect(doc.getElementsByTagName('w:bCs').length).toBe(0);
  });

  it('is case-insensitive for the prefix', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="360"/></w:pPr>
        <w:r><w:t>META TITLE: Тест</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(0);
  });

  it('does NOT modify non-meta paragraphs', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="720"/></w:pPr>
        <w:r><w:rPr><w:b/></w:rPr><w:t>H1: Заголовок</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(1);
    expect(doc.getElementsByTagName('w:b').length).toBe(1);
  });

  it('handles paragraph with text split across multiple w:t runs', () => {
    const doc = makeDoc(
      `<w:p>
        <w:pPr><w:ind w:left="720"/></w:pPr>
        <w:r><w:t xml:space="preserve">Meta title</w:t></w:r>
        <w:r><w:t>: Значення</w:t></w:r>
      </w:p>`,
    );
    resetMetaLineFormatting(doc);
    expect(doc.getElementsByTagName('w:ind').length).toBe(0);
  });
});
