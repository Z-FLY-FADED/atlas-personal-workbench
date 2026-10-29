import robotsParser from "npm:robots-parser@3.0.1";
import {
  authenticated,
  json,
  publicFetch,
  runtimeMode,
  sourceError,
} from "../_shared/http.ts";
import { canonical, parseSource, plain } from "../_shared/source_parser.ts";
import {
  normalizePublished,
  topicsFor,
  validateIndustrySource,
} from "../_shared/industry.ts";
import { parseWechatArticle } from "../_shared/wechat.ts";
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  let session;
  try {
    session = await authenticated(request);
  } catch {
    return json({ error: "请重新登录。" }, 401);
  }
  const { client, user } = session;
  try {
    const body = await request.json();
    if (!["public", "ai"].includes(await runtimeMode(client, user.id))) {
      return json({ error: "外部来源已关闭。" }, 403);
    }
    if (body.action === "read") {
      const raw = await publicFetch(body.url);
      const title = plain(
        /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ||
          new URL(body.url).host,
      );
      const text = plain(
        raw.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ""),
      );
      if (text.length < 60) throw new Error("未提取到正文，请粘贴原文。");
      return json({ title, content: text.slice(0, 100000), source: body.url });
    }
    const { data: source, error } = await client.from("atlas_entities").select(
      "*",
    ).eq("id", body.source_id).eq("user_id", user.id).eq(
      "kind",
      "industry_sources",
    ).is("deleted_at", null).single();
    if (error || !source) return json({ error: "来源不存在或无权访问。" }, 404);
    const p = source.payload;
    if (![true, 1, "1", "true"].includes(p.enabled)) {
      throw new Error("来源已停用。");
    }
    if ((p.purpose || "industry") === "industry") validateIndustrySource(p);
    const { data: claim, error: claimError } = await client.rpc(
      "atlas_claim_collection",
      { p_source: source.id },
    );
    if (claimError || claim !== true) {
      return json(
        { error: "来源正在采集或处于 5 分钟冷却期，请稍后重试。" },
        429,
      );
    }
    const started = new Date().toISOString();
    let added = 0;
    let status = "success";
    let message = "";
    try {
      const url = canonical(p.url, p.url);
      if (!["feed", "jin10", "cctv", "wechat_article"].includes(p.adapter)) {
        // Fail closed on an unavailable robots policy; never attempt authenticated scraping.
        const robotsUrl = new URL("/robots.txt", url).href;
        const parseRobots = robotsParser as unknown as (
          url: string,
          txt: string,
        ) => { isAllowed: (url: string, agent: string) => boolean | undefined };
        const robots = parseRobots(robotsUrl, await publicFetch(robotsUrl));
        if (robots.isAllowed(url, "WorkSpaceBot") === false) {
          throw new Error(
            "来源 robots.txt 不允许采集，请使用公开订阅或原站入口。",
          );
        }
      }
      const raw = await publicFetch(url, {
        headers: { "User-Agent": "WorkSpaceBot/1.0" },
      });
      const purpose = p.purpose || "industry";
      const rows = p.adapter === "wechat_article"
        ? parseWechatArticle(raw, url)
        : parseSource(raw, url, p.adapter || "feed", purpose);
      if (!rows.length) {
        throw new Error(
          "未解析到公开条目，可能需要登录、验证码或专用来源适配。请在原站查看。",
        );
      }
      if (
        purpose === "industry" &&
        ["tech_wechat", "company_wechat"].includes(p.source_channel) &&
        !rows.some((r) =>
          /(^|\.)weixin\.qq\.com$/i.test(new URL(r.canonical_url).hostname)
        )
      ) {
        throw new Error(
          "该订阅源没有返回微信文章，请核对公众号订阅地址；官网新闻应选择“大厂官网新闻”。",
        );
      }
      const terms = String(p.keywords || "").split(/[,，\s]+/).filter(Boolean);
      const imports = [];
      let acceptedRows = 0;
      for (const r of rows) {
        const topicTags = purpose === "industry"
          ? topicsFor(`${r.title} ${r.summary}`)
          : [];
        if (
          purpose === "industry" && Array.isArray(p.focus_topics) &&
          p.focus_topics.length && !p.focus_topics.some((t: string) =>
            topicTags.includes(t)
          )
        ) continue;
        if (
          purpose === "industry" &&
          ["tech_wechat", "company_wechat"].includes(p.source_channel) &&
          !/(^|\.)weixin\.qq\.com$/i.test(new URL(r.canonical_url).hostname)
        ) continue;
        if (
          terms.length &&
          !terms.some((t) =>
            `${r.title} ${r.summary}`.toLowerCase().includes(t.toLowerCase())
          )
        ) continue;
        acceptedRows++;
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(r.canonical_url),
            ),
          ),
        ).map((v) => v.toString(16).padStart(2, "0")).join("");
        imports.push({
          kind: "industry_articles",
          legacy_key: `collect:${purpose}:${hash}`,
          payload: {
            ...r,
            ...(purpose === "industry"
              ? {
                published_at: normalizePublished(r.published_at),
                source_channel: p.source_channel || "custom",
                publisher: r.publisher || p.publisher || p.name,
                topic_tags: topicTags,
                record_type:
                  ["tech_wechat", "company_wechat"].includes(p.source_channel)
                    ? "wechat_article"
                    : r.record_type,
              }
              : {}),
            source_id: source.id,
            source_name: p.name,
            purpose,
            industry: p.industry || "",
            fetched_at: started,
            url_hash: hash,
          },
        });
      }
      if (imports.length) {
        const { data, error } = await client.rpc("atlas_import_entities", {
          p_rows: imports,
        });
        if (error) throw new Error("保存采集结果失败。");
        added = data;
      }
      message =
        `解析 ${rows.length} 条，关注范围内 ${acceptedRows} 条，新增 ${added} 条（按网址去重）`;
    } catch (e) {
      status = "failed";
      message = sourceError(e);
    }
    const { error: logError } = await client.rpc("atlas_save_entity", {
      p_id: crypto.randomUUID(),
      p_kind: "industry_ingestion_runs",
      p_version: 0,
      p_payload: {
        source_id: source.id,
        source_name: p.name,
        purpose: p.purpose || "industry",
        started_at: started,
        finished_at: new Date().toISOString(),
        status,
        added,
        message,
      },
    });
    if (logError) throw new Error("采集日志保存失败，请刷新检查结果。");
    return json({ status, added, message });
  } catch (e) {
    return json({ error: sourceError(e) }, 400);
  }
});
