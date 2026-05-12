export type ParsedKeyword = {
  keyword: string;
  requiredMin: number;
  requiredMax: number;
};

export type KeywordStatus = 'ok' | 'missing' | 'excess';

export type KeywordResult = {
  keyword: string;
  requiredMin: number;
  requiredMax: number;
  actualCount: number;
  status: KeywordStatus;
  delta: number;
};

export type HeadingLevel =
  | 'meta-title'
  | 'meta-description'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4';

export interface ParsedHeading {
  level: HeadingLevel;
  text: string;
  textLower: string;
}

export interface ParsedDocument {
  label: string;
  headings: ParsedHeading[];
}

export interface DuplicateEntry {
  level: HeadingLevel;
  text: string;
  foundInDocuments: string[];
}

export type IssueKind = 'missing' | 'extra' | 'wrong-level' | 'meaning-mismatch' | 'order';

export interface StructureIssue {
  kind: IssueKind;
  originalHeading?: ParsedHeading;
  comparedHeading?: ParsedHeading;
  message: string;
}

export interface StructureDiff {
  documentLabel: string;
  issues: StructureIssue[];
}
