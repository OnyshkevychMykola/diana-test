export type ParsedKeyword = {
  keyword: string;
  requiredCount?: number;
};

export type KeywordStatus = 'ok' | 'missing' | 'excess';

export type KeywordResult = {
  keyword: string;
  requiredCount?: number;
  actualCount: number;
  status: KeywordStatus;
  delta: number;
};
