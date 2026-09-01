export type LegacyMarketKey = "A股" | "港股" | "纳斯达克";
export type MarketRegion = "CN" | "HK" | "US";
export type SignalStance = "positive" | "neutral" | "negative" | "insufficient_data";

export type StockFactors = {
  trend: number;
  momentum: number;
  quality: number;
  risk: number;
};

export type StockCandidate = {
  instrumentId: string;
  market: LegacyMarketKey;
  region: MarketRegion;
  exchange: string;
  code: string;
  name: string;
  industry: string;
  subIndustry: string;
  currency: "CNY" | "HKD" | "USD";
  price: number | null;
  change: number | null;
  score: number;
  signal: SignalStance;
  confidence: number;
  factors: StockFactors;
  risk: "中" | "中高" | "高";
  reason: string;
  watch: string;
  verified: boolean;
  sourceCount: number;
  quoteQuality: "verified" | "single_source" | "stale" | "conflict";
  asOf: string;
};

export type IndustryNews = {
  id: string;
  industry: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  verification: "verified" | "pending" | "failed";
  verifiedAt: string;
  sourceLevel: string;
  topic?: "industry" | "company";
  company?: string;
};

export type MarketPayload = {
  stocks: StockCandidate[];
  instruments?: StockCandidate[];
  markets?: Record<LegacyMarketKey, StockCandidate[]>;
  marketSummary?: Array<{
    region: MarketRegion;
    label: string;
    count: number;
    verifiedCount: number;
  }>;
  news: IndustryNews[];
  updatedAt: string;
  quoteSource: string;
  live: boolean;
  methodology: string;
};
