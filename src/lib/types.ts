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
