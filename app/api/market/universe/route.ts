import { marketIdentity, parseSignedNumber } from "../../../market-domain";
import type { LegacyMarketKey, MarketRegion, StockCandidate } from "../../../market-types";

export const dynamic = "force-dynamic";

type EastmoneyRow = {
  f2?: number | string;
  f3?: number | string;
  f12?: string;
  f13?: number;
  f14?: string;
  f100?: string;
};

type SearchSuggestion = {
  Code?: string;
  Name?: string;
  Classify?: string;
  QuoteID?: string;
};

const PAGE_SIZE = 100;
const EASTMONEY_FIELDS = "f12,f14,f2,f3,f13,f100";
const marketSources: Array<{ region: MarketRegion; market: LegacyMarketKey; filter: string }> = [
  { region: "CN", market: "A股", filter: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23" },
  { region: "HK", market: "港股", filter: "m:128+t:3,m:128+t:4" },
  { region: "US", market: "纳斯达克", filter: "m:105+t:1,m:106+t:1,m:107+t:1" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function identityFor(market: LegacyMarketKey, quoteCode: string, marketNumber?: number) {
  const base = marketIdentity(market, quoteCode);
  if (market !== "纳斯达克") return base;
  const exchange = marketNumber === 106 ? "NYSE" : marketNumber === 107 ? "AMEX" : "NASDAQ";
  return { ...base, exchange, instrumentId: `US:${exchange}:${quoteCode}` };
}

function toInstrument(row: EastmoneyRow, market: LegacyMarketKey): StockCandidate | null {
  const quoteCode = String(row.f12 || "").trim();
  const name = String(row.f14 || "").trim();
  if (!quoteCode || !name) return null;
  const identity = identityFor(market, quoteCode, row.f13);
  const price = parseSignedNumber(row.f2);
  const change = parseSignedNumber(row.f3);
  const industry = String(row.f100 || "").trim();
  const category = industry && industry !== "-" ? industry : "未分类";
  const trend = change == null ? 50 : Math.round(clamp(50 + change * 2, 20, 80));
  return {
    ...identity,
    market,
    code: market === "港股" ? `${quoteCode}.HK` : quoteCode,
    name,
    industry: category,
    subIndustry: category,
    price: price != null && price > 0 ? price : null,
    change,
    score: 50,
    signal: "insufficient_data",
    confidence: price != null ? 32 : 20,
    factors: { trend, momentum: 50, quality: price != null ? 32 : 20, risk: 50 },
    risk: "高",
    reason: "已纳入全市场股票目录；当前展示单一行情源的价格与涨跌，完成历史序列和多源核验后再生成研究信号。",
    watch: "财报、行业景气、成交活跃度与多源数据核验状态",
    verified: false,
    sourceCount: price != null ? 1 : 0,
    quoteQuality: "single_source",
    asOf: new Date().toISOString(),
  };
}

async function fetchMarketPage(source: (typeof marketSources)[number], page: number) {
  const params = new URLSearchParams({
    pn: String(page),
    pz: String(PAGE_SIZE),
    po: "0",
    np: "1",
    fltt: "2",
    invt: "2",
    fid: "f12",
    fs: source.filter,
    fields: EASTMONEY_FIELDS,
  });
  try {
    const response = await fetch(`https://push2.eastmoney.com/api/qt/clist/get?${params}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Atlas-Workspace-Market-Directory/1.0" },
    });
    if (!response.ok) return { total: 0, instruments: [] as StockCandidate[] };
    const payload = await response.json() as { data?: { total?: number; diff?: EastmoneyRow[] } };
    return {
      total: Number(payload.data?.total || 0),
      instruments: (payload.data?.diff || []).map((row) => toInstrument(row, source.market)).filter((item): item is StockCandidate => item !== null),
    };
  } catch {
    return { total: 0, instruments: [] as StockCandidate[] };
  }
}

function marketFromSuggestion(item: SearchSuggestion): LegacyMarketKey | null {
  const classify = String(item.Classify || "").toLowerCase();
  if (classify === "astock") return "A股";
  if (classify === "hk") return "港股";
  if (classify === "usstock") return "纳斯达克";
  return null;
}

async function searchMarket(query: string, scope: string) {
  const params = new URLSearchParams({ input: query, type: "14", count: "100", token: "D43BF722C8E33BE4945601EA54BD6C32" });
  try {
    const response = await fetch(`https://searchapi.eastmoney.com/api/suggest/get?${params}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Atlas-Workspace-Market-Directory/1.0" },
    });
    if (!response.ok) return [];
    const payload = await response.json() as { QuotationCodeTable?: { Data?: SearchSuggestion[] } };
    const suggestions = (payload.QuotationCodeTable?.Data || []).filter((item) => {
      const market = marketFromSuggestion(item);
      if (!market) return false;
      return scope === "ALL" || marketSources.find((source) => source.region === scope)?.market === market;
    });
    const quoteIds = suggestions.map((item) => item.QuoteID).filter((value): value is string => Boolean(value));
    if (!quoteIds.length) return [];
    const quoteParams = new URLSearchParams({ fltt: "2", invt: "2", fields: EASTMONEY_FIELDS, secids: quoteIds.join(",") });
    const quoteResponse = await fetch(`https://push2.eastmoney.com/api/qt/ulist.np/get?${quoteParams}`, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Atlas-Workspace-Market-Directory/1.0" },
    });
    const quotePayload = quoteResponse.ok ? await quoteResponse.json() as { data?: { diff?: EastmoneyRow[] } } : null;
    const rows = quotePayload?.data?.diff || [];
    const byCode = new Map(rows.map((row) => [String(row.f12 || ""), row]));
    return suggestions.map((suggestion) => {
      const market = marketFromSuggestion(suggestion);
      if (!market) return null;
      const code = String(suggestion.Code || "");
      const row = byCode.get(code) || { f12: code, f14: suggestion.Name, f13: Number(String(suggestion.QuoteID || "").split(".")[0]) };
      return toInstrument(row, market);
    }).filter((item): item is StockCandidate => item !== null);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = ["ALL", "CN", "HK", "US"].includes(url.searchParams.get("scope") || "") ? String(url.searchParams.get("scope")) : "ALL";
  const page = clamp(Number(url.searchParams.get("page") || 1), 1, 80);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 60);
  if (query) {
    const instruments = await searchMarket(query, scope);
    return Response.json({ instruments, total: instruments.length, page: 1, pageSize: instruments.length, hasMore: false, query }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  }
  const selectedSources = scope === "ALL" ? marketSources : marketSources.filter((source) => source.region === scope);
  const results = await Promise.all(selectedSources.map((source) => fetchMarketPage(source, page)));
  const instruments = results.flatMap((result) => result.instruments);
  const total = results.reduce((sum, result) => sum + result.total, 0);
  const hasMore = results.some((result) => page * PAGE_SIZE < result.total);
  return Response.json({ instruments, total, page, pageSize: PAGE_SIZE, hasMore, query: "" }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=300" } });
}
