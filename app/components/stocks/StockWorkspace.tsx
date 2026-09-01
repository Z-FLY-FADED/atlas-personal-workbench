"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketPayload, MarketRegion, SignalStance, StockCandidate } from "../../market-types";

type Scope = "ALL" | "WATCHLIST" | MarketRegion;
type SortMode = "signal" | "change" | "confidence";
type PriceRange = "all" | "under10" | "10to50" | "50to100" | "100to300" | "300to500" | "over500";
type UniversePayload = { instruments: StockCandidate[]; total: number; page: number; hasMore: boolean };

const DISPLAY_BATCH = 36;

const scopeOptions: Array<{ id: Scope; label: string; note: string }> = [
  { id: "ALL", label: "全部", note: "跨市场" },
  { id: "WATCHLIST", label: "自选", note: "我的关注" },
  { id: "CN", label: "A股", note: "沪深北" },
  { id: "HK", label: "港股", note: "港交所" },
  { id: "US", label: "美股", note: "Nasdaq 等" },
];

const signalLabels: Record<SignalStance, string> = {
  positive: "偏强观察",
  neutral: "中性观察",
  negative: "谨慎观察",
  insufficient_data: "数据不足",
};

const regionLabels: Record<MarketRegion, string> = { CN: "A股", HK: "港股", US: "美股" };

const priceRanges: Array<{ id: PriceRange; label: string; min?: number; max?: number }> = [
  { id: "all", label: "全部价格" },
  { id: "under10", label: "10 以下", max: 10 },
  { id: "10to50", label: "10–50", min: 10, max: 50 },
  { id: "50to100", label: "50–100", min: 50, max: 100 },
  { id: "100to300", label: "100–300", min: 100, max: 300 },
  { id: "300to500", label: "300–500", min: 300, max: 500 },
  { id: "over500", label: "500 以上", min: 500 },
];

function signalFor(stock: StockCandidate): SignalStance {
  if (stock.signal) return stock.signal;
  if (!stock.verified) return "insufficient_data";
  return stock.score >= 72 ? "positive" : stock.score >= 58 ? "neutral" : "negative";
}

function factorTone(value: number) {
  if (value >= 70) return "strong";
  if (value >= 50) return "balanced";
  return "weak";
}

export function StockWorkspace({
  market,
  loading,
  onRefresh,
  onNotify,
}: {
  market: MarketPayload | null;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onNotify: (message: string) => void;
}) {
  const [scope, setScope] = useState<Scope>("ALL");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("ALL");
  const [subIndustry, setSubIndustry] = useState("ALL");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [signal, setSignal] = useState<"all" | SignalStance>("all");
  const [sort, setSort] = useState<SortMode>("signal");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [watchlistReady, setWatchlistReady] = useState(false);
  const [directory, setDirectory] = useState<StockCandidate[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryHasMore, setDirectoryHasMore] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(DISPLAY_BATCH);

  const researchUniverse = useMemo(
    () => market?.instruments || (market?.markets ? Object.values(market.markets).flat() : market?.stocks || []),
    [market],
  );

  const universe = useMemo(() => {
    const merged = new Map(researchUniverse.map((stock) => [stock.instrumentId, stock]));
    directory.forEach((stock) => {
      if (!merged.has(stock.instrumentId)) merged.set(stock.instrumentId, stock);
    });
    return Array.from(merged.values());
  }, [directory, researchUniverse]);

  useEffect(() => {
    if (scope === "WATCHLIST") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setDirectoryLoading(true);
      const params = new URLSearchParams({ scope, page: "1" });
      if (query.trim()) params.set("q", query.trim());
      fetch(`/api/market/universe?${params}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((payload: UniversePayload) => {
          setDirectory(payload.instruments || []);
          setDirectoryPage(payload.page || 1);
          setDirectoryTotal(payload.total || 0);
          setDirectoryHasMore(Boolean(payload.hasMore));
          setDisplayLimit(DISPLAY_BATCH);
        })
        .catch(() => undefined)
        .finally(() => setDirectoryLoading(false));
    }, query.trim() ? 320 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, scope]);

  useEffect(() => {
    let active = true;
    fetch("/api/stocks/watchlist")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { instrumentIds?: string[] }) => {
        if (active) setWatchlist(new Set(data.instrumentIds || []));
      })
      .catch(() => undefined)
      .finally(() => active && setWatchlistReady(true));
    return () => {
      active = false;
    };
  }, []);

  const scopedUniverse = useMemo(
    () => universe.filter((stock) => scope === "ALL" || (scope === "WATCHLIST" ? watchlist.has(stock.instrumentId) : stock.region === scope)),
    [scope, universe, watchlist],
  );

  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    scopedUniverse.forEach((stock) => counts.set(stock.industry, (counts.get(stock.industry) || 0) + 1));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [scopedUniverse]);

  const subIndustries = useMemo(() => {
    const counts = new Map<string, number>();
    scopedUniverse
      .filter((stock) => industry === "ALL" || stock.industry === industry)
      .forEach((stock) => counts.set(stock.subIndustry || "其他", (counts.get(stock.subIndustry || "其他") || 0) + 1));
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [industry, scopedUniverse]);

  const visibleStocks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedPriceRange = priceRanges.find((item) => item.id === priceRange) || priceRanges[0];
    return scopedUniverse
      .filter((stock) => industry === "ALL" || stock.industry === industry)
      .filter((stock) => subIndustry === "ALL" || stock.subIndustry === subIndustry)
      .filter((stock) => selectedPriceRange.id === "all" || (stock.price != null && (selectedPriceRange.min == null || stock.price >= selectedPriceRange.min) && (selectedPriceRange.max == null || stock.price < selectedPriceRange.max)))
      .filter((stock) => signal === "all" || signalFor(stock) === signal)
      .filter((stock) => !normalizedQuery || `${stock.name} ${stock.code} ${stock.industry} ${stock.subIndustry} ${stock.exchange}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (sort === "change") return (b.change ?? -Infinity) - (a.change ?? -Infinity);
        if (sort === "confidence") return (b.confidence || 0) - (a.confidence || 0);
        return b.score - a.score;
      });
  }, [industry, priceRange, query, scopedUniverse, signal, sort, subIndustry]);

  const displayedStocks = visibleStocks.slice(0, displayLimit);

  const verifiedCount = universe.filter((stock) => stock.verified).length;
  const positiveCount = universe.filter((stock) => signalFor(stock) === "positive").length;

  async function toggleWatchlist(stock: StockCandidate) {
    const selected = watchlist.has(stock.instrumentId);
    setWatchlist((current) => {
      const next = new Set(current);
      if (selected) next.delete(stock.instrumentId);
      else next.add(stock.instrumentId);
      return next;
    });
    try {
      const response = await fetch(
        selected
          ? `/api/stocks/watchlist?instrumentId=${encodeURIComponent(stock.instrumentId)}`
          : "/api/stocks/watchlist",
        selected
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(stock),
            },
      );
      if (!response.ok) throw new Error("watchlist request failed");
      onNotify(selected ? `已将 ${stock.name} 移出自选` : `已将 ${stock.name} 加入自选`);
    } catch {
      setWatchlist((current) => {
        const next = new Set(current);
        if (selected) next.add(stock.instrumentId);
        else next.delete(stock.instrumentId);
        return next;
      });
      onNotify("自选同步失败，请确认数据库迁移已应用");
    }
  }

  async function showMoreStocks() {
    if (displayLimit < visibleStocks.length) {
      setDisplayLimit((current) => current + DISPLAY_BATCH);
      return;
    }
    if (!directoryHasMore || directoryLoading || scope === "WATCHLIST" || query.trim()) return;
    setDirectoryLoading(true);
    try {
      const nextPage = directoryPage + 1;
      const response = await fetch(`/api/market/universe?scope=${scope}&page=${nextPage}`);
      if (!response.ok) throw new Error("market directory request failed");
      const payload = await response.json() as UniversePayload;
      setDirectory((current) => {
        const merged = new Map(current.map((stock) => [stock.instrumentId, stock]));
        payload.instruments.forEach((stock) => merged.set(stock.instrumentId, stock));
        return Array.from(merged.values());
      });
      setDirectoryPage(payload.page || nextPage);
      setDirectoryTotal(payload.total || directoryTotal);
      setDirectoryHasMore(Boolean(payload.hasMore));
      setDisplayLimit((current) => current + DISPLAY_BATCH);
    } catch {
      onNotify("全市场股票目录暂时无法继续加载，请稍后重试");
    } finally {
      setDirectoryLoading(false);
    }
  }

  return (
    <section className="full-view stocks-workspace">
      <header className="stocks-hero">
        <div>
          <p>UNIFIED EQUITY RESEARCH</p>
          <h1>股票研究工作台</h1>
          <h2>A股、港股与美股统一检索、比较和跟踪，事实数据与研究信号分层展示。</h2>
        </div>
        <button className="secondary-action" onClick={onRefresh} disabled={loading}>
          <span aria-hidden="true">↻</span> {loading ? "正在核验" : "刷新行情"}
        </button>
      </header>

      <div className="stocks-disclaimer">
        <span>研究边界</span>
        <p><b>仅作研究与观察，不构成投资建议。</b> 信号来自公开行情的规则计算；请结合数据时间、来源状态和自身风险约束独立判断。</p>
        <small><i className={market?.live ? "live" : ""} />{market?.quoteSource || "行情服务等待连接"} · {market?.updatedAt || "暂未更新"}</small>
      </div>

      <div className="stocks-kpis" aria-label="股票研究概览">
        <article><span>覆盖标的</span><strong>{Math.max(directoryTotal, universe.length)}</strong><small>3 个市场统一视图</small></article>
        <article><span>多源核验</span><strong>{verifiedCount}</strong><small>{researchUniverse.length ? `${Math.round((verifiedCount / researchUniverse.length) * 100)}% 深度样本通过` : "等待数据"}</small></article>
        <article><span>偏强观察</span><strong>{positiveCount}</strong><small>不是买入评级</small></article>
        <article><span>我的自选</span><strong>{watchlistReady ? watchlist.size : "—"}</strong><small>按账户同步</small></article>
      </div>

      <div className="stocks-scope-tabs" role="tablist" aria-label="市场范围">
        {scopeOptions.map((item) => (
          <button key={item.id} role="tab" aria-selected={scope === item.id} className={scope === item.id ? "active" : ""} onClick={() => { setScope(item.id); setIndustry("ALL"); setSubIndustry("ALL"); }}>
            <b>{item.label}</b><small>{item.note}</small>
          </button>
        ))}
      </div>

      <div className="stocks-toolbar panel">
        <label className="stocks-search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setIndustry("ALL"); setSubIndustry("ALL"); }} placeholder="搜索全市场代码、公司或行业" aria-label="搜索股票" />
        </label>
        <label><span>一级行业</span><select value={industry} onChange={(event) => { setIndustry(event.target.value); setSubIndustry("ALL"); setDisplayLimit(DISPLAY_BATCH); }}><option value="ALL">全部</option>{industries.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.count}</option>)}</select></label>
        <label><span>细分行业</span><select value={subIndustry} onChange={(event) => { setSubIndustry(event.target.value); setDisplayLimit(DISPLAY_BATCH); }}><option value="ALL">全部</option>{subIndustries.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.count}</option>)}</select></label>
        <label><span>价格（原币）</span><select value={priceRange} onChange={(event) => setPriceRange(event.target.value as PriceRange)}>{priceRanges.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>信号</span><select value={signal} onChange={(event) => setSignal(event.target.value as "all" | SignalStance)}><option value="all">全部信号</option><option value="positive">偏强观察</option><option value="neutral">中性观察</option><option value="negative">谨慎观察</option><option value="insufficient_data">数据不足</option></select></label>
        <label><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="signal">综合信号</option><option value="change">当日涨跌</option><option value="confidence">数据置信度</option></select></label>
      </div>

      <div className="stocks-result-meta">
        <span>{query.trim() ? `全市场搜索到 ${directoryTotal} 个匹配标的` : `已载入 ${scopedUniverse.length} / ${Math.max(directoryTotal, scopedUniverse.length)} 个标的`} · 当前显示 {displayedStocks.length}</span>
        <small>{directoryLoading ? "正在扩充股票目录…" : "全市场目录分批载入；深度信号仅在完成历史与多源核验后生成"}</small>
      </div>

      {loading && !universe.length ? (
        <div className="stocks-loading"><i /><i /><i /></div>
      ) : (
        <div className="stocks-grid">
          {displayedStocks.map((stock) => {
            const stance = signalFor(stock);
            const factors = stock.factors || { trend: stock.score, momentum: 50, quality: stock.score, risk: Math.max(0, 100 - stock.score) };
            return (
              <article className="stock-research-card panel" key={stock.instrumentId || stock.code}>
                <header>
                  <div><span>{regionLabels[stock.region] || stock.market}</span><small>{stock.exchange}</small></div>
                  <div className="stock-card-actions">
                    <em className={`signal-pill ${stance}`}>{signalLabels[stance]}</em>
                    <button className={watchlist.has(stock.instrumentId) ? "saved" : ""} onClick={() => toggleWatchlist(stock)} aria-label={watchlist.has(stock.instrumentId) ? `从自选移除${stock.name}` : `将${stock.name}加入自选`} title={watchlist.has(stock.instrumentId) ? "移出自选" : "加入自选"}>☆</button>
                  </div>
                </header>
                <div className="stock-identity"><div><h3>{stock.name}</h3><p>{stock.code} · {stock.industry} / {stock.subIndustry || "其他"}</p></div><span className={stock.verified ? "verified" : "pending"}>{stock.verified ? "多源已核验" : `${stock.sourceCount || 0} 源待复核`}</span></div>
                <div className="stock-price"><strong>{stock.price == null ? "—" : stock.price.toFixed(2)}</strong><small>{stock.currency}</small><b className={(stock.change || 0) >= 0 ? "up" : "down"}>{stock.change == null ? "待更新" : `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`}</b></div>
                <div className="stock-confidence"><span>信号置信度</span><b>{stock.confidence ?? stock.score}%</b><i><u style={{ width: `${stock.confidence ?? stock.score}%` }} /></i></div>
                <div className="stock-factors">
                  {(["trend", "momentum", "quality", "risk"] as const).map((key) => <div key={key}><span>{{ trend: "趋势", momentum: "动量", quality: "数据", risk: "风险" }[key]}</span><b className={factorTone(factors[key])}>{factors[key]}</b></div>)}
                </div>
                <p className="stock-thesis">{stock.reason}</p>
                <footer><span>关注变量</span><p>{stock.watch}</p><small>截至 {stock.asOf || market?.updatedAt || "待更新"} · 模型 v2</small></footer>
              </article>
            );
          })}
        </div>
      )}

      {(displayLimit < visibleStocks.length || directoryHasMore) && !query.trim() && scope !== "WATCHLIST" && (
        <button className="stocks-load-more" type="button" onClick={showMoreStocks} disabled={directoryLoading}>
          {directoryLoading ? "正在载入…" : displayLimit < visibleStocks.length ? "显示更多股票" : "载入更多全市场股票"}
        </button>
      )}

      {!loading && !visibleStocks.length && <div className="stocks-empty"><span>⌕</span><h3>没有符合条件的股票</h3><p>尝试清空搜索词，或放宽市场、行业、价格和信号范围。</p></div>}
      {market?.methodology && <p className="stocks-methodology"><b>方法说明</b>{market.methodology}</p>}
    </section>
  );
}
