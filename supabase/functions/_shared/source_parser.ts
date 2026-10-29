import * as cheerio from "npm:cheerio@1.1.2";
import { XMLParser } from "npm:fast-xml-parser@5.3.0";
export type Row = Record<string, unknown> & {
  title: string;
  canonical_url: string;
  summary: string;
};
export const plain = (s: unknown) => {
  const $ = cheerio.load(String(s ?? ""));
  $("script,style").remove();
  return $.text().replace(/\s+/g, " ").trim();
};
export function canonical(input: string, base: string): string {
  const u = new URL(input, base);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) {
    throw new Error("无效原文链接。");
  }
  u.hash = "";
  if (u.hostname === "mp.weixin.qq.com") {
    u.protocol = "https:";
    for (const key of [...u.searchParams.keys()]) {
      if (
        [
          "chksm",
          "scene",
          "srcid",
          "from",
          "isappinstalled",
          "sharer_shareinfo",
          "sharer_shareinfo_first",
          "sharer_sharetime",
          "sharer_shareid",
        ].includes(key)
      ) u.searchParams.delete(key);
    }
  }
  for (const k of [...u.searchParams.keys()]) {
    if (/^utm_|^(spm|from)$/i.test(k)) u.searchParams.delete(k);
  }
  return u.href;
}
export function parseSource(
  raw: string,
  url: string,
  adapter: string,
  purpose: string,
): Row[] {
  const rows: Row[] = [];
  const add = (r: Row) => {
    if (r.title.trim() && r.canonical_url) rows.push(r);
  };
  if (adapter === "cctv") {
    const json = raw.trim().replace(/^tech\s*\(/, "").replace(/\);?\s*$/, "");
    const data = JSON.parse(json);
    if (!Array.isArray(data.data?.list)) {
      throw new Error("央视科技栏目数据格式已变化。");
    }
    for (const item of data.data.list.slice(0, 100)) {
      try {
        add({
          title: plain(item.title),
          summary: plain(item.brief),
          canonical_url: canonical(item.url, url),
          published_at: item.focus_date || null,
          record_type: "news",
        });
      } catch { /* invalid article */ }
    }
  } else if (adapter === "jin10") {
    const value = raw.trim().replace(/^var\s+newest\s*=\s*/, "").replace(
      /;\s*$/,
      "",
    );
    const entries = JSON.parse(value);
    if (!Array.isArray(entries)) throw new Error("金十来源格式已变化。");
    for (const e of entries.slice(0, 100)) {
      const text = plain(e.data?.content || e.data?.title);
      if (!text || !/^\d+$/.test(String(e.id))) continue;
      add({
        title: text.slice(0, 100),
        summary: text,
        canonical_url: `https://flash.jin10.com/detail/${e.id}`,
        published_at: e.time ? `${e.time.replace(" ", "T")}+08:00` : null,
        record_type: "flash",
      });
    }
  } else if (adapter === "feed") {
    if (raw.trim().startsWith("{")) {
      const json = JSON.parse(raw);
      if (!Array.isArray(json.items)) {
        throw new Error("JSON Feed 未包含文章列表。");
      }
      for (const item of json.items.slice(0, 100)) {
        const link = item.url || item.external_url;
        if (typeof link !== "string" || !link.trim()) continue;
        try {
          add({
            title: plain(item.title),
            summary: plain(
              item.summary || item.content_text || item.content_html,
            ),
            content_excerpt: plain(item.content_text || item.content_html)
              .slice(0, 100000),
            canonical_url: canonical(link, url),
            published_at: item.date_published || null,
            record_type: "article",
          });
        } catch { /* invalid entry */ }
      }
      return [...new Map(rows.map((r) => [r.canonical_url, r])).values()];
    }
    const doc = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      processEntities: false,
    }).parse(raw);
    const entries = doc.rss?.channel?.item ?? doc.feed?.entry ?? [];
    for (
      const e of (Array.isArray(entries) ? entries : [entries]).slice(0, 100)
    ) {
      const links = Array.isArray(e.link) ? e.link : [e.link];
      const link = links.find((v: unknown) => typeof v === "string") ||
        links.find((v: any) => v?.["@_rel"] === "alternate") || links[0];
      const target = typeof link === "object" ? link?.["@_href"] : link;
      if (!target) continue;
      try {
        add({
          title: plain(e.title?.["#text"] ?? e.title),
          content_excerpt: plain(
            e["content:encoded"] ?? e.content?.["#text"] ?? e.description ??
              e.summary?.["#text"] ?? e.summary ?? "",
          ).slice(0, 100000),
          summary: plain(
            e.description ?? e.summary?.["#text"] ?? e.summary ??
              e.content?.["#text"] ?? "",
          ),
          canonical_url: canonical(String(target), url),
          published_at: e.pubDate ?? e.published ?? e.updated ?? null,
          publisher: plain(
            e["dc:creator"] ??
              (typeof e.author === "string" ? e.author : e.author?.name),
          ),
          record_type: purpose === "career" ? "announcement" : "article",
        });
      } catch { /* skip invalid item */ }
    }
  } else {
    const $ = cheerio.load(raw);
    const walk = (v: any) => {
      if (Array.isArray(v)) {
        for (const e of v) walk(e);
        return;
      }
      if (!v || typeof v !== "object") return;
      if (
        v["@type"] === "JobPosting" ||
        (Array.isArray(v["@type"]) && v["@type"].includes("JobPosting"))
      ) {
        const org = v.hiringOrganization?.name || "";
        const location = v.jobLocation?.address?.addressLocality || "";
        try {
          add({
            title: plain(v.title),
            summary: plain(v.description),
            canonical_url: canonical(v.url || url, url),
            company: plain(org),
            role: plain(v.title),
            location: plain(location),
            deadline: v.validThrough || null,
            published_at: v.datePosted || null,
            record_type: "job",
          });
        } catch { /* invalid link */ }
      }
      for (const key of ["@graph", "mainEntity", "itemListElement", "item"]) {
        if (v[key]) walk(v[key]);
      }
    };
    $('script[type="application/ld+json"]').each((_, e) => {
      try {
        walk(JSON.parse($(e).text()));
      } catch { /* ignore malformed schema */ }
    });
    if (!rows.length) {
      $("nav,footer,header,script,style").remove();
      $("a[href]").each((_, e) => {
        const title = plain($(e).text());
        if (title.length < 6) return;
        if (
          purpose === "career" &&
          !/招聘|招录|职位|岗位|公务员|事业单位|考试|公告|人才|工程师|研究员|recruit|career|job|engineer/i
            .test(title)
        ) return;
        if (purpose !== "career" && title.length < 12) return;
        try {
          const link = canonical($(e).attr("href")!, url);
          if (link === canonical(url, url)) return;
          if (purpose === "career") {
            if (/我要招聘|我要找工作|登录|注册|发布职位|职位分类/.test(title)) {
              return;
            }
            const sourceHost = new URL(url).hostname;
            const target = new URL(link);
            if (
              /(^|\.)zhipin\.com$/i.test(sourceHost) &&
              (!/(^|\.)zhipin\.com$/i.test(target.hostname) ||
                !/^\/job_detail\/[^/]+\.html$/.test(target.pathname))
            ) return;
            if (
              /(^|\.)zhaopin\.com$/i.test(sourceHost) &&
              (!/(^|\.)zhaopin\.com$/i.test(target.hostname) ||
                !(target.hostname === "jobs.zhaopin.com" ||
                  /\/jobdetail\//i.test(target.pathname)))
            ) return;
          }
          add({
            title,
            summary: "列表入口，详情与截止日期请核对原文。",
            canonical_url: link,
            record_type: purpose === "career" ? "announcement" : "article",
          });
        } catch { /* skip */ }
      });
    }
  }
  return [...new Map(rows.map((r) => [r.canonical_url, r])).values()].slice(
    0,
    100,
  );
}
