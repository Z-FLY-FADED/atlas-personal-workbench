import { marketIdentity, parseSignedNumber } from "../../features/market/domain/market";
import { getEdgeCache } from "../edgeCache";
type MarketKey = "A股" | "港股" | "纳斯达克";
type RiskLevel = "中" | "中高" | "高";
type Candidate = {
    market: MarketKey;
    secid: string;
    quoteCode: string;
    yahoo: string;
    code: string;
    name: string;
    industry: string;
    subIndustry: string;
    baseScore: number;
    risk: RiskLevel;
    thesis: string;
    watch: string;
};
type Quote = {
    price: number;
    change: number | null;
};
type HistoryQuote = Quote & {
    closes: number[];
    currency: string;
    stale: boolean;
};
type StockResult = {
    instrumentId: string;
    market: MarketKey;
    region: "CN" | "HK" | "US";
    exchange: string;
    code: string;
    name: string;
    industry: string;
    subIndustry: string;
    price: number | null;
    change: number | null;
    currency: "CNY" | "HKD" | "USD";
    score: number;
    signal: "positive" | "neutral" | "negative" | "insufficient_data";
    confidence: number;
    factors: {
        trend: number;
        momentum: number;
        quality: number;
        risk: number;
    };
    risk: RiskLevel;
    reason: string;
    watch: string;
    verified: boolean;
    sourceCount: number;
    quoteQuality: "verified" | "single_source" | "stale" | "conflict";
    asOf: string;
};
const candidates: Candidate[] = [
    { market: "A股", secid: "0.002594", quoteCode: "002594", yahoo: "002594.SZ", code: "002594", name: "比亚迪", industry: "汽车", subIndustry: "新能源汽车整车", baseScore: 82, risk: "中高", thesis: "整车、动力电池与电驱链条覆盖较完整，是新能源汽车产业景气的重要观察样本。", watch: "价格竞争、海外扩张与单车盈利" },
    { market: "A股", secid: "0.300750", quoteCode: "300750", yahoo: "300750.SZ", code: "300750", name: "宁德时代", industry: "汽车", subIndustry: "动力电池", baseScore: 84, risk: "中高", thesis: "动力电池龙头，技术迭代与全球装机份额能够反映汽车电动化趋势。", watch: "电池价格、产能利用率与新技术量产" },
    { market: "A股", secid: "1.601689", quoteCode: "601689", yahoo: "601689.SS", code: "601689", name: "拓普集团", industry: "汽车", subIndustry: "汽车零部件", baseScore: 76, risk: "高", thesis: "汽车零部件与机器人执行器存在业务交叉，成长空间与预期波动并存。", watch: "客户集中度、机器人业务兑现节奏" },
    { market: "A股", secid: "0.300124", quoteCode: "300124", yahoo: "300124.SZ", code: "300124", name: "汇川技术", industry: "机器人", subIndustry: "工业自动化", baseScore: 83, risk: "中高", thesis: "工业自动化与伺服系统覆盖广，可跟踪制造业自动化资本开支和国产替代。", watch: "制造业需求、毛利率与应收账款" },
    { market: "A股", secid: "0.002747", quoteCode: "002747", yahoo: "002747.SZ", code: "002747", name: "埃斯顿", industry: "机器人", subIndustry: "工业机器人本体", baseScore: 73, risk: "高", thesis: "工业机器人本体与运动控制业务直接相关，但盈利修复仍需财报验证。", watch: "订单质量、费用率与经营现金流" },
    { market: "A股", secid: "1.688017", quoteCode: "688017", yahoo: "688017.SS", code: "688017", name: "绿的谐波", industry: "机器人", subIndustry: "核心零部件", baseScore: 75, risk: "高", thesis: "谐波减速器属于机器人关键零部件，量产预期较强且估值敏感。", watch: "产能释放、客户验证与估值消化" },
    { market: "A股", secid: "0.002371", quoteCode: "002371", yahoo: "002371.SZ", code: "002371", name: "北方华创", industry: "半导体", subIndustry: "半导体设备", baseScore: 85, risk: "中高", thesis: "半导体设备平台型公司，可用于观察国产设备验证和晶圆厂资本开支。", watch: "订单增速、研发投入与下游扩产" },
    { market: "A股", secid: "1.688981", quoteCode: "688981", yahoo: "688981.SS", code: "688981", name: "中芯国际", industry: "半导体", subIndustry: "晶圆制造", baseScore: 81, risk: "中高", thesis: "国内晶圆制造代表企业，产能利用率和资本开支是产业周期的重要变量。", watch: "产能利用率、成熟制程价格与资本开支" },
    { market: "A股", secid: "1.688041", quoteCode: "688041", yahoo: "688041.SS", code: "688041", name: "海光信息", industry: "半导体", subIndustry: "芯片设计", baseScore: 78, risk: "高", thesis: "高端处理器与算力需求相关，产业空间较大且对技术迭代和估值变化敏感。", watch: "产品迭代、客户结构与估值波动" },
    { market: "港股", secid: "116.00700", quoteCode: "00700", yahoo: "0700.HK", code: "00700.HK", name: "腾讯控股", industry: "科技", subIndustry: "互联网平台", baseScore: 83, risk: "中高", thesis: "社交、游戏、广告与云业务形成平台生态，适合作为中国互联网盈利质量观察样本。", watch: "广告与游戏增速、资本开支、回购及监管变化" },
    { market: "港股", secid: "116.01211", quoteCode: "01211", yahoo: "1211.HK", code: "01211.HK", name: "比亚迪股份", industry: "汽车", subIndustry: "新能源汽车整车", baseScore: 82, risk: "中高", thesis: "新能源汽车与动力电池一体化布局突出，可观察海外扩张和产品结构升级。", watch: "海外销量、价格竞争、毛利率与产能利用率" },
    { market: "港股", secid: "116.01810", quoteCode: "01810", yahoo: "1810.HK", code: "01810.HK", name: "小米集团", industry: "科技", subIndustry: "智能终端", baseScore: 78, risk: "高", thesis: "手机、IoT 与智能汽车形成跨终端生态，增长验证需要结合汽车交付与研发投入。", watch: "汽车交付、手机份额、费用率与供应链" },
    { market: "港股", secid: "116.09868", quoteCode: "09868", yahoo: "9868.HK", code: "09868.HK", name: "小鹏汽车", industry: "汽车", subIndustry: "新能源汽车整车", baseScore: 70, risk: "高", thesis: "智能驾驶和整车平台具有技术观察价值，但盈利与现金流仍处验证阶段。", watch: "月度交付、单车毛利、现金储备与新车型" },
    { market: "港股", secid: "116.02015", quoteCode: "02015", yahoo: "2015.HK", code: "02015.HK", name: "理想汽车", industry: "汽车", subIndustry: "新能源汽车整车", baseScore: 75, risk: "高", thesis: "产品定位与销售效率具有代表性，需要持续验证纯电转型和产品周期。", watch: "交付量、纯电车型爬坡、销售费用与现金流" },
    { market: "港股", secid: "116.00981", quoteCode: "00981", yahoo: "0981.HK", code: "00981.HK", name: "中芯国际", industry: "半导体", subIndustry: "晶圆制造", baseScore: 80, risk: "中高", thesis: "港股晶圆制造核心样本，成熟制程景气和资本开支决定中期盈利弹性。", watch: "产能利用率、晶圆价格、折旧与资本开支" },
    { market: "港股", secid: "116.01347", quoteCode: "01347", yahoo: "1347.HK", code: "01347.HK", name: "华虹半导体", industry: "半导体", subIndustry: "特色工艺制造", baseScore: 73, risk: "高", thesis: "特色工艺晶圆代工具有周期弹性，需要关注新增产能爬坡和价格恢复。", watch: "特色工艺需求、产能爬坡、毛利率与折旧" },
    { market: "纳斯达克", secid: "105.NVDA", quoteCode: "NVDA", yahoo: "NVDA", code: "NVDA", name: "英伟达", industry: "半导体", subIndustry: "芯片设计", baseScore: 88, risk: "中高", thesis: "加速计算生态和数据中心业务具有行业代表性，增长预期与估值敏感度都较高。", watch: "数据中心收入、毛利率、供应约束与客户资本开支" },
    { market: "纳斯达克", secid: "105.AMD", quoteCode: "AMD", yahoo: "AMD", code: "AMD", name: "AMD", industry: "半导体", subIndustry: "芯片设计", baseScore: 80, risk: "高", thesis: "CPU、GPU 与数据中心产品组合持续扩展，份额提升仍需收入和利润验证。", watch: "数据中心增速、AI加速卡放量、毛利率与库存" },
    { market: "纳斯达克", secid: "105.ASML", quoteCode: "ASML", yahoo: "ASML", code: "ASML", name: "阿斯麦", industry: "半导体", subIndustry: "半导体设备", baseScore: 85, risk: "中高", thesis: "先进光刻设备具有关键产业地位，订单、交付和出口限制共同影响业绩节奏。", watch: "订单积压、EUV交付、客户资本开支与出口限制" },
    { market: "纳斯达克", secid: "105.TSLA", quoteCode: "TSLA", yahoo: "TSLA", code: "TSLA", name: "特斯拉", industry: "汽车", subIndustry: "新能源汽车整车", baseScore: 76, risk: "高", thesis: "电动车、储能和自动驾驶叙事叠加，基本面与预期波动都较大。", watch: "交付量、汽车毛利、储能增速与自动驾驶进展" },
    { market: "纳斯达克", secid: "105.RIVN", quoteCode: "RIVN", yahoo: "RIVN", code: "RIVN", name: "Rivian", industry: "汽车", subIndustry: "新能源汽车整车", baseScore: 64, risk: "高", thesis: "电动车产品和新平台具有成长想象，但规模化、现金消耗和盈利路径仍需验证。", watch: "产量、交付、单位成本、现金储备与新平台进度" },
    { market: "纳斯达克", secid: "105.ISRG", quoteCode: "ISRG", yahoo: "ISRG", code: "ISRG", name: "直觉外科", industry: "机器人", subIndustry: "医疗机器人", baseScore: 84, risk: "中高", thesis: "手术机器人装机与耗材收入形成高质量商业模式，可观察医疗机器人长期渗透。", watch: "装机量、手术量、耗材收入与监管审批" },
    { market: "纳斯达克", secid: "105.MSFT", quoteCode: "MSFT", yahoo: "MSFT", code: "MSFT", name: "微软", industry: "科技", subIndustry: "云与企业软件", baseScore: 86, risk: "中", thesis: "云计算、企业软件和人工智能平台形成稳定现金流与长期增长组合。", watch: "Azure增速、AI资本开支、利润率与监管风险" },
    { market: "纳斯达克", secid: "105.GOOGL", quoteCode: "GOOGL", yahoo: "GOOGL", code: "GOOGL", name: "Alphabet", industry: "科技", subIndustry: "互联网平台", baseScore: 84, risk: "中高", thesis: "搜索广告、云计算和人工智能投入共同决定增长质量与竞争位置。", watch: "广告增速、云利润、AI投入回报与反垄断风险" },
];
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function parsePrice(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
async function getEastmoneyQuotes() {
    const result = new Map<string, Quote>();
    try {
        const fields = "f12,f2,f3";
        const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=${fields}&secids=${candidates.map((item) => item.secid).join(",")}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(7500), headers: { "User-Agent": "Atlas-Workspace-Market-Research/2.0" } });
        if (!response.ok)
            return result;
        const payload = await response.json() as {
            data?: {
                diff?: Array<{
                    f12: string;
                    f2: number;
                    f3: number;
                }>;
            };
        };
        for (const item of payload.data?.diff || []) {
            const price = parsePrice(item.f2);
            if (price)
                result.set(item.f12, { price, change: Number.isFinite(item.f3) ? item.f3 : null });
        }
    }
    catch { /* fall through to independent web sources */ }
    return result;
}
async function getSinaQuotes() {
    const symbols = candidates.map((item) => item.market === "A股" ? `${item.quoteCode.startsWith("6") ? "sh" : "sz"}${item.quoteCode}` : item.market === "港股" ? `rt_hk${item.quoteCode}` : `gb_${item.quoteCode.toLowerCase()}`).join(",");
    const result = new Map<string, Quote>();
    try {
        const response = await fetch(`https://hq.sinajs.cn/list=${symbols}`, { signal: AbortSignal.timeout(7000), headers: { Referer: "https://finance.sina.com.cn/", "User-Agent": "Atlas-Workspace-Quote-Validator/2.0" } });
        if (!response.ok)
            return result;
        const text = await response.text();
        for (const line of text.split("\n")) {
            const aShare = line.match(/hq_str_(?:sh|sz)(\d{6})="([^"]*)"/);
            const hk = line.match(/hq_str_rt_hk(\d{5})="([^"]*)"/);
            const us = line.match(/hq_str_gb_([a-z.]+)="([^"]*)"/i);
            if (aShare) {
                const fields = aShare[2].split(",");
                const previous = Number(fields[2]);
                const price = Number(fields[3]);
                if (price > 0 && previous > 0)
                    result.set(aShare[1], { price, change: (price / previous - 1) * 100 });
            }
            else if (hk) {
                const fields = hk[2].split(",");
                const price = Number(fields[6]);
                const change = Number(fields[8]);
                if (price > 0)
                    result.set(hk[1], { price, change: Number.isFinite(change) ? change : null });
            }
            else if (us) {
                const fields = us[2].split(",");
                const price = Number(fields[1]);
                const change = Number(fields[2]);
                if (price > 0)
                    result.set(us[1].toUpperCase(), { price, change: Number.isFinite(change) ? change : null });
            }
        }
    }
    catch { /* source unavailable */ }
    return result;
}
function getTencentSymbol(item: Candidate) {
    if (item.market === "A股")
        return `${item.quoteCode.startsWith("6") ? "sh" : "sz"}${item.quoteCode}`;
    if (item.market === "港股")
        return `hk${item.quoteCode}`;
    return `us${item.quoteCode}.OQ`;
}
async function getTencentHistory(item: Candidate): Promise<[
    string,
    HistoryQuote | null
]> {
    try {
        const symbol = getTencentSymbol(item);
        const response = await fetch(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${encodeURIComponent(symbol)},day,,,60,qfq`, { signal: AbortSignal.timeout(7500), headers: { "User-Agent": "Mozilla/5.0 Atlas-Market-Research/2.0", Referer: "https://gu.qq.com/", Accept: "application/json" } });
        if (!response.ok)
            return [item.code, null];
        const payload = await response.json() as {
            data?: Record<string, {
                qfqday?: unknown[][];
                day?: unknown[][];
            }>;
        };
        const node = payload.data?.[symbol];
        const rows = node?.qfqday?.length ? node.qfqday : node?.day || [];
        const closes = rows.map((row) => parsePrice(row[2])).filter((value): value is number => value !== null);
        const price = closes.at(-1) ?? null;
        if (!price)
            return [item.code, null];
        const previous = closes.at(-2) ?? null;
        const latestDate = String(rows.at(-1)?.[0] || "");
        const latestTime = latestDate ? new Date(`${latestDate}T16:00:00+08:00`).getTime() : 0;
        const currency = item.market === "A股" ? "CNY" : item.market === "港股" ? "HKD" : "USD";
        return [item.code, { price, change: previous ? (price / previous - 1) * 100 : null, closes, currency, stale: !latestTime || Date.now() - latestTime > 7 * 86400000 }];
    }
    catch {
        return [item.code, null];
    }
}
async function getNasdaqOfficialQuote(item: Candidate): Promise<[
    string,
    Quote | null
]> {
    if (item.market !== "纳斯达克")
        return [item.code, null];
    try {
        const response = await fetch(`https://api.nasdaq.com/api/quote/${encodeURIComponent(item.quoteCode)}/info?assetclass=stocks`, { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9" } });
        if (!response.ok)
            return [item.code, null];
        const payload = await response.json() as {
            data?: {
                primaryData?: {
                    lastSalePrice?: string;
                    percentageChange?: string;
                };
            };
        };
        const price = parsePrice(payload.data?.primaryData?.lastSalePrice);
        if (!price)
            return [item.code, null];
        const change = parseSignedNumber(payload.data?.primaryData?.percentageChange?.replace("%", ""));
        return [item.code, { price, change }];
    }
    catch {
        return [item.code, null];
    }
}
function buildAnalysis(item: Candidate, primary: Quote | undefined, history: HistoryQuote | null, tertiary: Quote | null): StockResult {
    const prices = [primary?.price, history?.price, tertiary?.price].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
    const reference = average(prices);
    const tolerance = 0.008;
    const verified = prices.length >= 2 && reference !== null && prices.every((price) => Math.abs(price - reference) / reference <= tolerance) && !history?.stale;
    const closes = history?.closes || [];
    const price = primary?.price ?? history?.price ?? tertiary?.price ?? null;
    const ma5 = average(closes.slice(-5));
    const ma20 = average(closes.slice(-20));
    const momentum20 = closes.length >= 21 ? (closes.at(-1)! / closes.at(-21)! - 1) * 100 : null;
    const returns = closes.slice(-21).map((value, index, values) => index ? (value / values[index - 1] - 1) * 100 : 0).slice(1);
    const returnMean = average(returns) || 0;
    const volatility = returns.length ? Math.sqrt(returns.reduce((sum, value) => sum + (value - returnMean) ** 2, 0) / returns.length) : null;
    let trendScore = 50;
    if (price && ma5 && ma20)
        trendScore = price >= ma5 && ma5 >= ma20 ? 82 : price >= ma20 ? 65 : price < ma5 && ma5 < ma20 ? 28 : 42;
    const momentumScore = momentum20 === null ? 50 : clamp(50 + momentum20 * 1.8, 20, 82);
    const riskPenalty = volatility === null ? 4 : volatility > 4 ? 10 : volatility > 2.5 ? 6 : 0;
    const dataQualityScore = verified ? 86 : prices.length >= 2 ? 62 : prices.length === 1 ? 38 : 20;
    const stabilityScore = volatility === null ? 42 : clamp(100 - volatility * 12, 20, 90);
    let score = Math.round(trendScore * .42 + momentumScore * .23 + dataQualityScore * .25 + stabilityScore * .10 - riskPenalty);
    if (!history || prices.length < 2)
        score = Math.min(score, 59);
    else if (!verified)
        score = Math.min(score, 69);
    score = clamp(score, 35, 92);
    const trendText = !price || !ma20 ? "历史序列不足，暂按低置信度观察" : price >= ma20 ? (ma5 && ma5 >= ma20 ? "短中期均线保持多头结构" : "价格位于20日均线上方，但短线节奏仍需确认") : "价格位于20日均线下方，趋势尚未确认";
    const momentumText = momentum20 === null ? "近20日动量待补充" : `近20日动量${momentum20 >= 0 ? "+" : ""}${momentum20.toFixed(1)}%`;
    const dataText = verified ? `${prices.length}个行情源价格一致` : prices.length >= 2 ? "多源价格存在时点差异，评分已降级" : "仅取得单一行情源，评分上限已限制";
    const watch = [item.watch, ma20 ? `MA20 ${ma20.toFixed(2)}` : "MA20待补充", volatility === null ? "波动率待补充" : `20日波动 ${volatility.toFixed(1)}%`, dataText].join("；");
    const dynamicRisk: RiskLevel = volatility !== null && volatility > 4 ? "高" : item.risk;
    const identity = marketIdentity(item.market, item.quoteCode);
    const confidence = clamp(Math.round(dataQualityScore * .7 + Math.min(closes.length / 60, 1) * 30), 20, 96);
    const quoteQuality = verified ? "verified" : history?.stale ? "stale" : prices.length < 2 ? "single_source" : "conflict";
    const signal = confidence < 45 ? "insufficient_data" : score >= 68 ? "positive" : score >= 50 ? "neutral" : "negative";
    return {
        ...identity,
        market: item.market,
        code: item.code,
        name: item.name,
        industry: item.industry,
        subIndustry: item.subIndustry,
        price,
        change: primary?.change ?? history?.change ?? tertiary?.change ?? null,
        score,
        signal,
        confidence,
        factors: { trend: Math.round(trendScore), momentum: Math.round(momentumScore), quality: dataQualityScore, risk: Math.round(stabilityScore) },
        risk: dynamicRisk,
        reason: `${trendText}，${momentumText}。${item.thesis}`,
        watch,
        verified,
        sourceCount: prices.length,
        quoteQuality,
        asOf: new Date().toISOString(),
    };
}
export async function GET(request: Request) {
    const edgeCache = getEdgeCache();
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.delete("refresh");
    cacheUrl.searchParams.set("schema", "stocks-v3");
    const cacheKey = new Request(cacheUrl, { method: "GET" });
    const cached = new URL(request.url).searchParams.has('refresh') ? undefined : await edgeCache?.match(cacheKey);
    if (cached) {
        return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: new Headers(cached.headers),
        });
    }
    const [eastmoney, sina, historyEntries, nasdaqEntries] = await Promise.all([
        getEastmoneyQuotes(),
        getSinaQuotes(),
        Promise.all(candidates.map(getTencentHistory)),
        Promise.all(candidates.filter((item) => item.market === "纳斯达克").map(getNasdaqOfficialQuote)),
    ]);
    const history = new Map(historyEntries);
    const nasdaq = new Map(nasdaqEntries);
    const markets = { "A股": [] as StockResult[], "港股": [] as StockResult[], "纳斯达克": [] as StockResult[] };
    for (const item of candidates) {
        const primary = eastmoney.get(item.quoteCode);
        const tertiary = item.market === "纳斯达克" ? nasdaq.get(item.code) || sina.get(item.quoteCode) || null : sina.get(item.quoteCode) || null;
        markets[item.market].push(buildAnalysis(item, primary, history.get(item.code) || null, tertiary));
    }
    for (const key of Object.keys(markets) as MarketKey[])
        markets[key].sort((a, b) => b.score - a.score);
    const allStocks = Object.values(markets).flat();
    const updatedAt = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    const verifiedCount = allStocks.filter((item) => item.verified).length;
    const methodology = "统一展示不等于使用主观统一评级：趋势42%、20日动量23%、数据质量25%、波动稳健性10%，再按数据缺失和波动风险降级；信号同时展示置信度、时间和多源核验状态。历史序列来自腾讯行情，现价由东方财富与新浪交叉核对，美股增加 Nasdaq 报价；来源不足、数据陈旧或价格冲突时不输出强信号。";
    const marketSummary = (["A股", "港股", "纳斯达克"] as const).map((key) => ({
        region: key === "A股" ? "CN" as const : key === "港股" ? "HK" as const : "US" as const,
        label: key === "纳斯达克" ? "美股" : key,
        count: markets[key].length,
        verifiedCount: markets[key].filter((item) => item.verified).length,
    }));
    const response = Response.json({ stocks: markets["A股"], instruments: allStocks, markets, marketSummary, news: [], updatedAt, quoteSource: `多市场网页行情交叉核验（${verifiedCount}/${allStocks.length}）`, live: allStocks.some((item) => item.price !== null), methodology }, { headers: { "Cache-Control": "public, max-age=90, s-maxage=300, stale-while-revalidate=600" } });
    if (edgeCache) {
        try {
            await edgeCache.put(cacheKey, response.clone());
        }
        catch (error) {
            console.error("market edge cache write failed", error);
        }
    }
    return response;
}
export function offlineMarket() {
    const instruments = candidates.map(item => buildAnalysis(item, undefined, null, null));
    const markets = { 'A股': instruments.filter(item => item.market === 'A股'), '港股': instruments.filter(item => item.market === '港股'), '纳斯达克': instruments.filter(item => item.market === '纳斯达克') };
    return { stocks: markets['A股'], instruments, markets, news: [], updatedAt: '', quoteSource: '本机研究目录，暂无行情缓存', live: false, methodology: '离线目录不包含实时价格与有效行情信号。' };
}
