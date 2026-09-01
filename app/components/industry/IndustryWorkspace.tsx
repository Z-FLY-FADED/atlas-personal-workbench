"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  INDUSTRY_CATEGORIES,
  type IndustryArticle,
  type IndustryCategory,
  type IndustryPayload,
  type IndustrySource,
} from "../../industry/types";

type Lens = "全部" | "行业趋势" | "企业动态";

function formatTime(value: string) {
  if (!value) return "尚未采集";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function authenticityLabel(article: IndustryArticle) {
  if (article.sourceAuthenticity === "official") return "官方来源";
  if (article.sourceAuthenticity === "reviewed") return "已审核来源";
  return "来源待审核";
}

function contentLabel(article: IndustryArticle) {
  if (article.contentStatus === "full") return "全文已提取";
  if (article.contentStatus === "excerpt") return "正文片段已提取";
  if (article.contentStatus === "summary_only") return "摘要可用";
  return "正文暂不可用";
}

export function IndustryWorkspace({ onNotify }: { onNotify: (message: string) => void }) {
  const [payload, setPayload] = useState<IndustryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [industry, setIndustry] = useState<IndustryCategory>("汽车");
  const [lens, setLens] = useState<Lens>("全部");
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sources, setSources] = useState<IndustrySource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const initialRefresh = useRef(false);

  async function loadIndustry() {
    const response = await fetch("/api/industry?limit=80", { cache: "no-store" });
    if (!response.ok) throw new Error("行业资讯加载失败");
    const data = await response.json() as IndustryPayload;
    setPayload(data);
    return data;
  }

  useEffect(() => {
    loadIndustry()
      .then((data) => {
        if (!data.lastSuccessfulAt && !initialRefresh.current) {
          initialRefresh.current = true;
          refreshSources(false);
        }
      })
      .catch(() => onNotify("行业资讯加载失败，请确认数据库迁移已应用"))
      .finally(() => setLoading(false));
  }, []);

  async function refreshSources(force = true) {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const response = await fetch("/api/industry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", force }),
      });
      const result = await response.json() as { inserted?: number; failed?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "刷新失败");
      await loadIndustry();
      onNotify(`采集完成：新增 ${result.inserted || 0} 条，${result.failed || 0} 个来源失败`);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "行业资讯刷新失败");
    } finally {
      setRefreshing(false);
    }
  }

  async function articleAction(article: IndustryArticle, action: "read" | "star" | "mute", value: boolean) {
    if (!payload) return;
    setPayload({
      ...payload,
      articles: action === "mute"
        ? payload.articles.filter((item) => item.id !== article.id)
        : payload.articles.map((item) => item.id === article.id ? { ...item, read: action === "read" ? value : item.read, starred: action === "star" ? value : item.starred } : item),
      unreadCount: action === "read" ? Math.max(0, payload.unreadCount + (value && !article.read ? -1 : !value && article.read ? 1 : 0)) : payload.unreadCount,
      starredCount: action === "star" ? Math.max(0, payload.starredCount + (value && !article.starred ? 1 : !value && article.starred ? -1 : 0)) : payload.starredCount,
    });
    try {
      const response = await fetch("/api/industry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, articleId: article.id, value }),
      });
      if (!response.ok) throw new Error();
    } catch {
      await loadIndustry().catch(() => undefined);
      onNotify("操作未保存，已恢复服务器状态");
    }
  }

  async function saveKnowledge(article: IndustryArticle) {
    if (article.knowledgeId) {
      onNotify("该资讯已存入知识库");
      return;
    }
    try {
      const response = await fetch("/api/industry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-knowledge", articleId: article.id }),
      });
      const result = await response.json() as { knowledgeId?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "保存失败");
      setPayload((current) => current ? {
        ...current,
        articles: current.articles.map((item) => item.id === article.id ? { ...item, knowledgeId: result.knowledgeId || null, starred: true, read: true } : item),
      } : current);
      onNotify("已存入知识库，并保留原文与来源");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "保存到知识库失败");
    }
  }

  async function openSources() {
    setSourceOpen(true);
    setSourcesLoading(true);
    try {
      const response = await fetch("/api/industry/sources", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { sources: IndustrySource[] };
      setSources(data.sources);
    } catch {
      onNotify("来源列表加载失败");
    } finally {
      setSourcesLoading(false);
    }
  }

  async function saveSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSourceSaving(true);
    try {
      const response = await fetch("/api/industry/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json() as { sources?: IndustrySource[]; refresh?: { inserted?: number; failed?: number }; error?: string };
      if (!response.ok) throw new Error(result.error || "来源保存失败");
      setSources(result.sources || []);
      await loadIndustry();
      event.currentTarget.reset();
      onNotify(`来源已添加，首次采集新增 ${result.refresh?.inserted || 0} 条`);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "来源保存失败");
    } finally {
      setSourceSaving(false);
    }
  }

  async function toggleSource(source: IndustrySource) {
    const response = await fetch("/api/industry/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, enabled: !source.enabled }),
    });
    const result = await response.json() as { sources?: IndustrySource[]; error?: string };
    if (!response.ok) return onNotify(result.error || "来源状态更新失败");
    setSources(result.sources || []);
  }

  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (payload?.articles || []).filter((article) =>
      article.industry === industry &&
      (lens === "全部" || (lens === "企业动态" ? article.topic === "company" : article.topic !== "company")) &&
      (!starredOnly || article.starred) &&
      (!needle || `${article.title} ${article.summary} ${article.source} ${article.company || ""}`.toLowerCase().includes(needle)),
    );
  }, [payload, industry, lens, query, starredOnly]);

  return (
    <section className="full-view insight-view industry-workspace">
      <div className="view-title">
        <div>
          <p>INDUSTRY INTELLIGENCE</p>
          <h1>行业情报收件箱</h1>
          <h2>官方来源优先，增量采集、指纹去重，并把有价值的资讯沉淀为知识。</h2>
        </div>
        <div className="industry-title-actions">
          <button className="secondary-action" onClick={openSources}>☷ 管理来源</button>
          <button className="secondary-action refresh-action" disabled={refreshing} onClick={() => refreshSources(true)}>
            <span aria-hidden="true">↻</span> {refreshing ? "采集中…" : "立即采集"}
          </button>
        </div>
      </div>

      <div className="industry-overview-strip">
        <article><small>UNREAD</small><b>{payload?.unreadCount || 0}</b><span>未读情报</span></article>
        <article><small>STARRED</small><b>{payload?.starredCount || 0}</b><span>重点关注</span></article>
        <article><small>SOURCES</small><b>{payload?.sourceCount || 0}</b><span>已配置来源</span></article>
        <article className={payload?.unhealthySourceCount ? "warning" : ""}><small>HEALTH</small><b>{payload?.unhealthySourceCount || 0}</b><span>连续失败来源</span></article>
        <article className="industry-last-sync"><small>LAST INGESTION</small><b>{formatTime(payload?.lastSuccessfulAt || "")}</b><span>后台按来源频率增量采集</span></article>
      </div>

      <div className="industry-tabs">
        {INDUSTRY_CATEGORIES.map((item) => (
          <button key={item} className={industry === item ? "active" : ""} onClick={() => setIndustry(item)}>
            {item}<span>{payload?.counts[item] || 0}</span>
          </button>
        ))}
      </div>

      <div className="industry-filterbar">
        <div className="news-lens-tabs">
          <span>信息范围</span>
          {(["全部", "行业趋势", "企业动态"] as const).map((item) => (
            <button key={item} className={lens === item ? "active" : ""} onClick={() => setLens(item)}>{item}</button>
          ))}
          <button className={starredOnly ? "active" : ""} onClick={() => setStarredOnly((value) => !value)}>★ 重点</button>
        </div>
        <label className="industry-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司、技术、政策或来源" /></label>
      </div>

      <div className="news-layout">
        <section className="news-feed">
          {visibleArticles.map((article, index) => (
            <article className={`news-card panel industry-news-card ${article.read ? "read" : ""}`} key={article.id}>
              <span className="news-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <div className="news-meta">
                  <b>{article.company ? `${article.company} · ${article.source}` : article.source}</b>
                  <time>{formatTime(article.publishedAt)}</time>
                  <em className={article.topic === "company" ? "source-company" : "source-verified"}>{article.topic === "company" ? "企业动态" : "行业趋势"}</em>
                  {!article.read && <i>未读</i>}
                </div>
                <a href={article.url} target="_blank" rel="noreferrer" onClick={() => articleAction(article, "read", true)}>
                  <h3>{article.title}</h3>
                </a>
                <p>{article.summary || "该来源未提供摘要，请打开原文查看。"}</p>
                <div className="industry-evidence-row">
                  <span>{authenticityLabel(article)}</span><span>{contentLabel(article)}</span><span>重要度 {article.importanceScore}</span><span>置信度 {article.confidenceScore}</span>
                </div>
                <footer>
                  首次发现 {formatTime(article.discoveredAt)}
                  <span className="industry-card-actions">
                    <button onClick={() => articleAction(article, "star", !article.starred)} aria-label={article.starred ? "取消重点" : "设为重点"}>{article.starred ? "★ 已关注" : "☆ 关注"}</button>
                    <button onClick={() => saveKnowledge(article)}>{article.knowledgeId ? "✓ 已入库" : "存入知识库"}</button>
                    <button onClick={() => articleAction(article, "mute", true)}>忽略</button>
                    <a href={article.url} target="_blank" rel="noreferrer" onClick={() => articleAction(article, "read", true)}>原文 ↗</a>
                  </span>
                </footer>
              </div>
            </article>
          ))}
          {!loading && !visibleArticles.length && <div className="empty-state">当前筛选下没有资讯。可切换行业、取消重点筛选，或添加新的 RSS/RSSHub 来源。</div>}
          {loading && <div className="empty-state">正在读取行业情报…</div>}
        </section>

        <aside className="panel signal-card industry-method-card">
          <small>COLLECTION STATUS</small>
          <h3>{industry}情报方法</h3>
          <div><span>01</span><p><b>增量采集</b>支持 RSS/Atom、ETag、Last-Modified 和失败退避。</p></div>
          <div><span>02</span><p><b>分层核验</b>来源真实性、正文状态和交叉印证不再混为一个标签。</p></div>
          <div><span>03</span><p><b>行动闭环</b>重点资讯可收藏并一键沉淀到现有知识库。</p></div>
          <blockquote>{payload?.methodology || "正在载入采集规则…"}</blockquote>
        </aside>
      </div>

      {sourceOpen && (
        <div className="industry-source-layer" role="dialog" aria-modal="true" aria-label="行业来源管理">
          <button className="industry-source-scrim" onClick={() => setSourceOpen(false)} aria-label="关闭来源管理" />
          <aside className="industry-source-drawer">
            <header><div><small>SOURCE REGISTRY</small><h2>行业来源管理</h2><p>优先添加官方 RSS/Atom；无原生 Feed 的网站可使用自建 RSSHub 地址。</p></div><button onClick={() => setSourceOpen(false)} aria-label="关闭">×</button></header>
            <form className="industry-source-form" onSubmit={saveSource}>
              <label><span>来源名称</span><input name="name" required placeholder="例如：某企业官方新闻" /></label>
              <label className="wide"><span>RSS / Atom 地址</span><input name="url" type="url" required placeholder="https://example.com/feed.xml" /></label>
              <label><span>行业</span><select name="industry" defaultValue={industry}>{INDUSTRY_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>类型</span><select name="kind"><option value="rss">RSS / Atom</option><option value="rsshub">RSSHub</option></select></label>
              <label><span>内容范围</span><select name="topic"><option value="industry">行业趋势</option><option value="company">企业动态</option></select></label>
              <label><span>来源等级</span><select name="trustLevel"><option value="official">官方</option><option value="institution">机构</option><option value="media">专业媒体</option><option value="community">社区线索</option></select></label>
              <label><span>关联公司</span><input name="company" placeholder="可选" /></label>
              <label><span>采集间隔</span><select name="pollIntervalMinutes"><option value="30">30 分钟</option><option value="60">1 小时</option><option value="120">2 小时</option><option value="360">6 小时</option><option value="1440">每天</option></select></label>
              <button className="wide" type="submit" disabled={sourceSaving}>{sourceSaving ? "验证并采集中…" : "添加并首次采集"}</button>
            </form>
            <div className="industry-source-list">
              {sourcesLoading && <p>正在读取来源…</p>}
              {sources.map((source) => (
                <article key={source.id} className={!source.enabled ? "disabled" : source.consecutiveFailures >= 3 ? "error" : ""}>
                  <div><b>{source.name}</b><span>{source.industry} · {source.kind.toUpperCase()} · {source.trustLevel}</span><small>{source.lastError || `最近成功：${formatTime(source.lastSuccessAt)}`}</small></div>
                  {source.kind === "seed" ? <em>内置</em> : <button onClick={() => toggleSource(source)}>{source.enabled ? "停用" : "启用"}</button>}
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

