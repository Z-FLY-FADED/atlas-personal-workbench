import { env } from "cloudflare:workers";
import { enrichKnowledge, parseKnowledgeEnrichment } from "../../knowledge-enrichment";
import { analyzeKnowledgeContent, rankKnowledgeRelations } from "../../knowledge-intelligence";
import { getOwnerId, unauthorizedResponse } from "../auth";

export const dynamic = "force-dynamic";

function shanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shanghaiTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

type TaskCompletion = { id: string; completedAt: string; completedOn: string };

function parseCompletionHistory(value: unknown): TaskCompletion[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const completedAt = String(entry.completedAt || "").trim();
      const completedOn = String(entry.completedOn || "").trim();
      if (!completedAt && !completedOn) return [];
      return [{ id: String(entry.id || `${completedOn}-${completedAt}`), completedAt, completedOn }];
    });
  } catch { return []; }
}

function parseStringArray(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? [...new Set(parsed.map(String).map((item) => item.trim()).filter(Boolean))] : [];
  } catch { return []; }
}

function parseNumberArray(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? [...new Set(parsed.map(Number).filter((item) => Number.isFinite(item) && item > 0))] : [];
  } catch { return []; }
}

function isSafePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '0.0.0.0' || host === '127.0.0.1' || host === '::1') return false;
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
    if (ipv4 && (ipv4[0] === 10 || ipv4[0] === 127 || (ipv4[0] === 192 && ipv4[1] === 168) || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) || (ipv4[0] === 169 && ipv4[1] === 254))) return false;
    return true;
  } catch { return false; }
}

function decodeEntities(value: string) {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
}

async function crawlPublicSource(input: string) {
  const matchedUrl = input.match(/https?:\/\/[^\s<>"']+/)?.[0];
  if (!matchedUrl || !isSafePublicUrl(matchedUrl)) return null;
  try {
    const response = await fetch(matchedUrl, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Atlas-Workspace-Research-Crawler/1.0' } });
    if (!response.ok || !isSafePublicUrl(response.url)) return null;
    const contentLength = Number(response.headers.get('content-length') || 0);
    const contentType = response.headers.get('content-type') || '';
    if (contentLength > 2_000_000 || !contentType.includes('text/html')) return { url: response.url, host: new URL(response.url).hostname, title: '', summary: '', extracted: '' };
    const html = await response.text();
    const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '');
    const description = decodeEntities(html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)/i)?.[1] || '');
    const extracted = decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 12000);
    return { url: response.url, host: new URL(response.url).hostname, title, summary: description, extracted };
  } catch { return null; }
}

export async function GET(request: Request) {
  const userId = getOwnerId(request);
  if (!userId) return unauthorizedResponse();
  try {
    const todayKey = shanghaiDateKey();
    // Remove only the two exact first-release demo records. User-created tasks
    // are never matched by this migration, so a new workspace really opens at 0/0.
    await env.DB.prepare(`DELETE FROM tasks WHERE owner_id = ? AND (
      (title = ? AND detail = ? AND horizon = ? AND date = ?) OR
      (title = ? AND detail = ? AND horizon = ? AND date = ?)
    )`).bind(
      userId,
      "完成产品需求梳理", "个人工作台 v1.0", "今日", "今天 10:00",
      "整理 Codex 对话记录", "归档至知识库 · AI 工具", "今日", "今天 14:30",
    ).run();
    // 今日任务按自然日重复执行；跨日只清除当前完成状态，完成历史仍保留。
    await env.DB.prepare("UPDATE tasks SET done = 0, completed_at = '', completed_on = '' WHERE owner_id = ? AND horizon = ? AND done = 1 AND (completed_on = '' OR completed_on IS NULL OR completed_on <> ?)")
      .bind(userId, "今日", todayKey).run();
    const [taskResult, knowledgeResult, applicationResult, profileResult, resumeResult, projectResult, noteResult, reminderResult] = await env.DB.batch([
      env.DB.prepare("SELECT id, title, detail, priority, horizon, done, date, completed_at AS completedAt, completed_on AS completedOn, completion_history AS completionHistory, project_id AS projectId FROM tasks WHERE owner_id = ? ORDER BY id DESC").bind(userId),
      env.DB.prepare("SELECT id, title, summary, content, primary_category AS primaryCategory, secondary_category AS secondaryCategory, confidence, source, source_type AS sourceType, created_at AS createdAt, completeness, enrichment, keywords, related_ids AS relatedIds, related_topics AS relatedTopics FROM knowledge WHERE owner_id = ? ORDER BY id DESC").bind(userId),
      env.DB.prepare("SELECT id, company, role, status, channel, applied_at AS appliedAt, next_action AS nextAction, notes FROM applications WHERE owner_id = ? ORDER BY id DESC").bind(userId),
      env.DB.prepare("SELECT display_name AS displayName, motto, avatar_text AS avatarText, accent, updated_at AS updatedAt FROM profiles WHERE owner_id = ? LIMIT 1").bind(userId),
      env.DB.prepare("SELECT file_name AS fileName, content, updated_at AS updatedAt FROM resumes WHERE owner_id = ? LIMIT 1").bind(userId),
      env.DB.prepare("SELECT id, title, stage, status, progress, next_milestone AS nextMilestone, due_date AS dueDate, remaining_tasks AS remainingTasks, accent, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE owner_id = ? ORDER BY CASE status WHEN '进行中' THEN 0 ELSE 1 END, updated_at DESC, id DESC").bind(userId),
      env.DB.prepare("SELECT id, content, status, created_at AS createdAt, updated_at AS updatedAt FROM quick_notes WHERE owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT 80").bind(userId),
      env.DB.prepare("SELECT id, title, remind_at AS remindAt, done, created_at AS createdAt FROM reminders WHERE owner_id = ? ORDER BY done ASC, remind_at ASC LIMIT 80").bind(userId),
    ]);
    const normalizedKnowledge = knowledgeResult.results.map((row) => {
      const item = row as Record<string, unknown>;
      const title = String(item.title || "未命名知识");
      const summary = String(item.summary || "");
      const content = String(item.content || "");
      const keywords = parseStringArray(item.keywords);
      const relatedTopics = parseStringArray(item.relatedTopics);
      const primaryCategory = String(item.primaryCategory || "").trim();
      const secondaryCategory = String(item.secondaryCategory || "").trim();
      const needsRepair = !primaryCategory || !secondaryCategory || !keywords.length || !relatedTopics.length;
      const fallback = needsRepair
        ? analyzeKnowledgeContent({ title, content, summaryHint: summary, sourceType: String(item.sourceType || "手动输入") })
        : null;
      return {
        ...item,
        id: Number(item.id), title, summary, content,
        primaryCategory: primaryCategory || fallback?.primaryCategory || "通用",
        secondaryCategory: secondaryCategory || fallback?.secondaryCategory || "未分类",
        keywords: keywords.length ? keywords : fallback?.keywords || [],
        relatedTopics: relatedTopics.length ? relatedTopics : fallback?.relatedTopics || [],
        relatedIds: parseNumberArray(item.relatedIds),
      };
    });
    const enrichedKnowledge = normalizedKnowledge.map((item) => {
      const stored = parseKnowledgeEnrichment(item.enrichment);
      const enrichment = stored || enrichKnowledge({
        title: item.title, summary: item.summary, content: item.content,
        primaryCategory: item.primaryCategory, secondaryCategory: item.secondaryCategory,
      });
      const relatedIds = item.relatedIds.length ? item.relatedIds : rankKnowledgeRelations(item, normalizedKnowledge).map((relation) => relation.id);
      return { ...item, relatedIds, enrichment, completeness: enrichment.completeness };
    });
    return Response.json({
      tasks: taskResult.results.map((task) => ({ ...task, done: Boolean(task.done), completionHistory: parseCompletionHistory((task as Record<string, unknown>).completionHistory) })),
      knowledge: enrichedKnowledge,
      applications: applicationResult.results,
      profile: profileResult.results[0] || { displayName: "用户名", motto: "专注 · 自洽 · 成长", avatarText: "用", accent: "gold", updatedAt: "" },
      resume: resumeResult.results[0] || null,
      projects: projectResult.results,
      quickNotes: noteResult.results,
      reminders: reminderResult.results.map((reminder) => ({ ...reminder, done: Boolean(reminder.done) })),
    });
  } catch (error) {
    console.error("workspace GET failed", error);
    return Response.json({ error: "workspace unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const userId = getOwnerId(request);
  if (!userId) return unauthorizedResponse();
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.type === "task") {
      const completed = Boolean(payload.done);
      const completedAt = completed ? String(payload.completedAt ?? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())) : "";
      const completedOn = completed ? String(payload.completedOn ?? shanghaiDateKey()) : "";
      const completionHistory = completed ? JSON.stringify([{ id: `${Date.now()}`, completedAt, completedOn }]) : "[]";
      const projectId = Number(payload.projectId) > 0 ? Number(payload.projectId) : null;
      const result = await env.DB.prepare("INSERT INTO tasks (owner_id, title, detail, priority, horizon, done, date, completed_at, completed_on, completion_history, project_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, String(payload.title ?? "未命名任务"), String(payload.detail ?? ""), String(payload.priority ?? "一般"), String(payload.horizon ?? "今日"), completed ? 1 : 0, String(payload.date ?? "待安排"), completedAt, completedOn, completionHistory, projectId)
        .run();
      return Response.json({ item: { ...payload, id: result.meta.last_row_id, projectId, done: completed, completedAt, completedOn, completionHistory: parseCompletionHistory(completionHistory) } }, { status: 201 });
    }
    if (payload.type === "project") {
      const title = String(payload.title ?? "未命名项目").trim().slice(0, 80) || "未命名项目";
      const stage = String(payload.stage ?? "规划中").trim().slice(0, 30) || "规划中";
      const status = ["进行中", "已暂停", "已完成"].includes(String(payload.status)) ? String(payload.status) : "进行中";
      const progress = Math.min(100, Math.max(0, Math.round(Number(payload.progress) || 0)));
      const nextMilestone = String(payload.nextMilestone ?? "确定下一里程碑").trim().slice(0, 100) || "确定下一里程碑";
      const dueDate = String(payload.dueDate ?? "待安排").trim().slice(0, 40) || "待安排";
      const remainingTasks = Math.max(0, Math.round(Number(payload.remainingTasks) || 0));
      const accent = /^#[0-9a-f]{6}$/i.test(String(payload.accent)) ? String(payload.accent) : "#a97d30";
      const timestamp = shanghaiTimestamp();
      const result = await env.DB.prepare("INSERT INTO projects (owner_id, title, stage, status, progress, next_milestone, due_date, remaining_tasks, accent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, timestamp, timestamp).run();
      return Response.json({ item: { id: result.meta.last_row_id, title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, createdAt: timestamp, updatedAt: timestamp } }, { status: 201 });
    }
    if (payload.type === "quick-note") {
      const content = String(payload.content ?? "").replace(/\u0000/g, "").trim().slice(0, 6000);
      if (!content) return Response.json({ error: "速记内容不能为空" }, { status: 400 });
      const timestamp = shanghaiTimestamp();
      const result = await env.DB.prepare("INSERT INTO quick_notes (owner_id, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(userId, content, "待整理", timestamp, timestamp).run();
      return Response.json({ item: { id: result.meta.last_row_id, content, status: "待整理", createdAt: timestamp, updatedAt: timestamp } }, { status: 201 });
    }
    if (payload.type === "reminder") {
      const title = String(payload.title ?? "新提醒").trim().slice(0, 100) || "新提醒";
      const remindAt = String(payload.remindAt ?? "").trim().slice(0, 40);
      if (!remindAt) return Response.json({ error: "提醒时间不能为空" }, { status: 400 });
      const timestamp = shanghaiTimestamp();
      const result = await env.DB.prepare("INSERT INTO reminders (owner_id, title, remind_at, done, created_at) VALUES (?, ?, ?, 0, ?)")
        .bind(userId, title, remindAt, timestamp).run();
      return Response.json({ item: { id: result.meta.last_row_id, title, remindAt, done: false, createdAt: timestamp } }, { status: 201 });
    }
    if (payload.type === "knowledge") {
      const rawContent = String(payload.content ?? "");
      const crawled = await crawlPublicSource(rawContent);
      const submittedTitle = String(payload.title ?? "未命名知识");
      const content = crawled?.extracted ? `${rawContent}\n\n[网页正文抓取]\n${crawled.extracted}` : rawContent;
      const candidateTitle = crawled?.title && /新收录内容|未命名知识/.test(submittedTitle) ? crawled.title : submittedTitle;
      const intelligence = analyzeKnowledgeContent({ title: candidateTitle, content, sourceType: String(payload.sourceType ?? "手动输入"), summaryHint: crawled?.summary || String(payload.summary ?? "") });
      const { title, summary, primaryCategory, secondaryCategory, confidence, keywords, relatedTopics } = intelligence;
      const enrichment = enrichKnowledge({ title, summary, content, primaryCategory, secondaryCategory });
      const existingResult = await env.DB.prepare("SELECT id, title, summary, content, primary_category AS primaryCategory, secondary_category AS secondaryCategory, keywords, related_ids AS relatedIds, related_topics AS relatedTopics FROM knowledge WHERE owner_id = ? ORDER BY id DESC").bind(userId).all();
      const existing = existingResult.results.map((row) => {
        const item = row as Record<string, unknown>;
        const storedKeywords = parseStringArray(item.keywords);
        const storedTopics = parseStringArray(item.relatedTopics);
        const primaryCategory = String(item.primaryCategory || "").trim();
        const secondaryCategory = String(item.secondaryCategory || "").trim();
        const needsRepair = !primaryCategory || !secondaryCategory || !storedKeywords.length || !storedTopics.length;
        const fallback = needsRepair
          ? analyzeKnowledgeContent({ title: String(item.title || ""), content: String(item.content || ""), summaryHint: String(item.summary || "") })
          : null;
        return {
          id: Number(item.id), title: String(item.title || ""), summary: String(item.summary || ""), content: String(item.content || ""),
          primaryCategory: primaryCategory || fallback?.primaryCategory || "通用",
          secondaryCategory: secondaryCategory || fallback?.secondaryCategory || "未分类",
          keywords: storedKeywords.length ? storedKeywords : fallback?.keywords || [],
          relatedTopics: storedTopics.length ? storedTopics : fallback?.relatedTopics || [],
          relatedIds: parseNumberArray(item.relatedIds),
        };
      });
      const draft = { id: -1, title, summary, content, primaryCategory, secondaryCategory, keywords, relatedTopics };
      const relations = rankKnowledgeRelations(draft, existing);
      const relatedIds = relations.map((relation) => relation.id);
      const result = await env.DB.prepare("INSERT INTO knowledge (owner_id, title, summary, content, category, primary_category, secondary_category, confidence, source, source_type, created_at, completeness, enrichment, keywords, related_ids, related_topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, title, summary, content, secondaryCategory, primaryCategory, secondaryCategory, confidence, crawled?.host || String(payload.source ?? "手动"), String(payload.sourceType ?? "手动输入"), String(payload.createdAt ?? "刚刚"), enrichment.completeness, JSON.stringify(enrichment), JSON.stringify(keywords), JSON.stringify(relatedIds), JSON.stringify(relatedTopics))
        .run();
      const id = Number(result.meta.last_row_id);
      const reciprocalUpdates = relations.flatMap((relation) => {
        const item = existing.find((entry) => entry.id === relation.id);
        if (!item) return [];
        const reciprocalIds = [...new Set([id, ...item.relatedIds])].slice(0, 8);
        return [env.DB.prepare("UPDATE knowledge SET related_ids = ? WHERE owner_id = ? AND id = ?").bind(JSON.stringify(reciprocalIds), userId, item.id)];
      });
      if (reciprocalUpdates.length) await env.DB.batch(reciprocalUpdates);
      return Response.json({ item: { ...payload, id, title, summary, content, source: crawled?.host || payload.source, crawledUrl: crawled?.url, primaryCategory, secondaryCategory, confidence, keywords, relatedTopics, relatedIds, enrichment, completeness: enrichment.completeness } }, { status: 201 });
    }
    if (payload.type === "resume") {
      const fileName = String(payload.fileName ?? "个人简历").trim().slice(0, 180) || "个人简历";
      const content = String(payload.content ?? "").replace(/\u0000/g, "").trim().slice(0, 100000);
      if (content.length < 50) return Response.json({ error: "简历内容过短" }, { status: 400 });
      const updatedAt = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      await env.DB.prepare(`INSERT INTO resumes (owner_id, file_name, content, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(owner_id) DO UPDATE SET file_name = excluded.file_name, content = excluded.content, updated_at = excluded.updated_at`)
        .bind(userId, fileName, content, updatedAt).run();
      return Response.json({ item: { fileName, content, updatedAt } }, { status: 201 });
    }
    if (payload.type === "application") {
      const result = await env.DB.prepare("INSERT INTO applications (owner_id, company, role, status, channel, applied_at, next_action, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, String(payload.company ?? "未命名公司"), String(payload.role ?? "未命名岗位"), String(payload.status ?? "已投递"), String(payload.channel ?? "手动记录"), String(payload.appliedAt ?? "今天"), String(payload.nextAction ?? "等待反馈"), String(payload.notes ?? ""))
        .run();
      return Response.json({ item: { ...payload, id: result.meta.last_row_id } }, { status: 201 });
    }
    return Response.json({ error: "unsupported type" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = getOwnerId(request);
  if (!userId) return unauthorizedResponse();
  try {
    const payload = await request.json() as { type?: string; action?: string; id?: number; done?: boolean; title?: string; detail?: string; priority?: string; horizon?: string; date?: string; completedAt?: string; completedOn?: string; company?: string; role?: string; status?: string; channel?: string; appliedAt?: string; nextAction?: string; notes?: string; displayName?: string; motto?: string; avatarText?: string; accent?: string; updatedAt?: string; content?: string; stage?: string; progress?: number; nextMilestone?: string; dueDate?: string; remainingTasks?: number; remindAt?: string; projectId?: number | null };
    if (payload.type === "profile") {
      const displayName = String(payload.displayName ?? "用户名").trim().slice(0, 24) || "用户名";
      const motto = String(payload.motto ?? "专注 · 自洽 · 成长").trim().slice(0, 60);
      const firstCharacter = displayName.match(/[\p{Script=Han}\p{L}\p{N}]/u)?.[0] || "个";
      const avatarText = /[a-z]/i.test(firstCharacter) ? firstCharacter.toUpperCase() : firstCharacter;
      const allowedAccents = new Set(["gold", "blue", "green", "rose", "violet", "slate"]);
      const accent = allowedAccents.has(String(payload.accent)) ? String(payload.accent) : "gold";
      const updatedAt = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
      await env.DB.prepare(`INSERT INTO profiles (owner_id, display_name, motto, avatar_text, accent, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(owner_id) DO UPDATE SET display_name = excluded.display_name, motto = excluded.motto, avatar_text = excluded.avatar_text, accent = excluded.accent, updated_at = excluded.updated_at`)
        .bind(userId, displayName, motto, avatarText, accent, updatedAt).run();
      return Response.json({ item: { displayName, motto, avatarText, accent, updatedAt }, updated: true });
    }
    if (payload.type === "project" && payload.id) {
      const title = String(payload.title ?? "未命名项目").trim().slice(0, 80) || "未命名项目";
      const stage = String(payload.stage ?? "规划中").trim().slice(0, 30) || "规划中";
      const status = ["进行中", "已暂停", "已完成"].includes(String(payload.status)) ? String(payload.status) : "进行中";
      const progress = Math.min(100, Math.max(0, Math.round(Number(payload.progress) || 0)));
      const nextMilestone = String(payload.nextMilestone ?? "确定下一里程碑").trim().slice(0, 100) || "确定下一里程碑";
      const dueDate = String(payload.dueDate ?? "待安排").trim().slice(0, 40) || "待安排";
      const remainingTasks = Math.max(0, Math.round(Number(payload.remainingTasks) || 0));
      const accent = /^#[0-9a-f]{6}$/i.test(String(payload.accent)) ? String(payload.accent) : "#a97d30";
      const updatedAt = shanghaiTimestamp();
      const updated = await env.DB.prepare("UPDATE projects SET title = ?, stage = ?, status = ?, progress = ?, next_milestone = ?, due_date = ?, remaining_tasks = ?, accent = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
        .bind(title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, updatedAt, payload.id, userId).run();
      if (!updated.meta.changes) return Response.json({ error: "project not found" }, { status: 404 });
      return Response.json({ item: { id: payload.id, title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, updatedAt }, updated: true });
    }
    if (payload.type === "quick-note" && payload.id) {
      const content = String(payload.content ?? "").replace(/\u0000/g, "").trim().slice(0, 6000);
      const status = ["待整理", "已整理", "已归档"].includes(String(payload.status)) ? String(payload.status) : "待整理";
      if (!content) return Response.json({ error: "速记内容不能为空" }, { status: 400 });
      const updatedAt = shanghaiTimestamp();
      const updated = await env.DB.prepare("UPDATE quick_notes SET content = ?, status = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
        .bind(content, status, updatedAt, payload.id, userId).run();
      if (!updated.meta.changes) return Response.json({ error: "note not found" }, { status: 404 });
      return Response.json({ item: { id: payload.id, content, status, updatedAt }, updated: true });
    }
    if (payload.type === "reminder" && payload.id) {
      const done = Boolean(payload.done);
      const updated = await env.DB.prepare("UPDATE reminders SET done = ? WHERE id = ? AND owner_id = ?")
        .bind(done ? 1 : 0, payload.id, userId).run();
      if (!updated.meta.changes) return Response.json({ error: "reminder not found" }, { status: 404 });
      return Response.json({ item: { id: payload.id, done }, updated: true });
    }
    if (payload.type === "application" && payload.id) {
      const updated = await env.DB.prepare("UPDATE applications SET company = ?, role = ?, status = ?, channel = ?, applied_at = ?, next_action = ?, notes = ? WHERE id = ? AND owner_id = ?")
        .bind(String(payload.company ?? "未命名公司"), String(payload.role ?? "未命名岗位"), String(payload.status ?? "已投递"), String(payload.channel ?? "手动记录"), String(payload.appliedAt ?? "今天"), String(payload.nextAction ?? "等待反馈"), String(payload.notes ?? ""), payload.id, userId).run();
      if (!updated.meta.changes) {
        const inserted = await env.DB.prepare("INSERT INTO applications (owner_id, company, role, status, channel, applied_at, next_action, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(userId, String(payload.company ?? "未命名公司"), String(payload.role ?? "未命名岗位"), String(payload.status ?? "已投递"), String(payload.channel ?? "手动记录"), String(payload.appliedAt ?? "今天"), String(payload.nextAction ?? "等待反馈"), String(payload.notes ?? "")).run();
        return Response.json({ item: { ...payload, id: inserted.meta.last_row_id }, updated: true });
      }
      return Response.json({ item: payload, updated: true });
    }
    if (payload.type !== "task" || !payload.id) return Response.json({ error: "invalid task" }, { status: 400 });
    if (payload.action === "reset-daily") {
      await env.DB.prepare("UPDATE tasks SET done = 0, completed_at = '', completed_on = '' WHERE id = ? AND owner_id = ? AND horizon = ?")
        .bind(payload.id, userId, "今日").run();
      return Response.json({ item: { id: payload.id, done: false, completedAt: "", completedOn: "" }, updated: true });
    }
    if (payload.action === "edit") {
      const projectId = Number(payload.projectId) > 0 ? Number(payload.projectId) : null;
      const updated = await env.DB.prepare("UPDATE tasks SET title = ?, detail = ?, priority = ?, horizon = ?, date = ?, project_id = ? WHERE id = ? AND owner_id = ?")
        .bind(String(payload.title ?? "未命名任务"), String(payload.detail ?? ""), String(payload.priority ?? "一般"), String(payload.horizon ?? "今日"), String(payload.date ?? "待安排"), projectId, payload.id, userId).run();
      if (!updated.meta.changes) {
        const inserted = await env.DB.prepare("INSERT INTO tasks (owner_id, title, detail, priority, horizon, done, date, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(userId, String(payload.title ?? "未命名任务"), String(payload.detail ?? ""), String(payload.priority ?? "一般"), String(payload.horizon ?? "今日"), payload.done ? 1 : 0, String(payload.date ?? "待安排"), String(payload.completedAt ?? "")).run();
        return Response.json({ item: { id: inserted.meta.last_row_id, title: payload.title, detail: payload.detail, priority: payload.priority, horizon: payload.horizon, date: payload.date, completedAt: payload.completedAt, done: Boolean(payload.done) } });
      }
      return Response.json({ item: { id: payload.id, title: payload.title, detail: payload.detail, priority: payload.priority, horizon: payload.horizon, date: payload.date, projectId, completedAt: payload.completedAt, done: Boolean(payload.done) } });
    }
    const current = await env.DB.prepare("SELECT completion_history AS completionHistory FROM tasks WHERE id = ? AND owner_id = ? LIMIT 1").bind(payload.id, userId).first();
    const history = parseCompletionHistory((current as Record<string, unknown> | null)?.completionHistory);
    const done = Boolean(payload.done);
    const completedAt = done ? String(payload.completedAt ?? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())) : "";
    const completedOn = done ? String(payload.completedOn ?? shanghaiDateKey()) : "";
    const nextHistory = done ? [...history, { id: `${Date.now()}-${payload.id}`, completedAt, completedOn }] : history.slice(0, -1);
    const toggled = await env.DB.prepare("UPDATE tasks SET done = ?, completed_at = ?, completed_on = ?, completion_history = ? WHERE id = ? AND owner_id = ?").bind(done ? 1 : 0, completedAt, completedOn, JSON.stringify(nextHistory), payload.id, userId).run();
    if (!toggled.meta.changes) {
      const inserted = await env.DB.prepare("INSERT INTO tasks (owner_id, title, detail, priority, horizon, done, date, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, String(payload.title ?? "未命名任务"), String(payload.detail ?? ""), String(payload.priority ?? "一般"), String(payload.horizon ?? "今日"), payload.done ? 1 : 0, String(payload.date ?? "待安排"), String(payload.completedAt ?? "")).run();
      return Response.json({ item: { id: inserted.meta.last_row_id, title: payload.title, detail: payload.detail, priority: payload.priority, horizon: payload.horizon, date: payload.date, completedAt: payload.completedAt, done: Boolean(payload.done) } });
    }
    return Response.json({ item: { id: payload.id, title: payload.title, detail: payload.detail, priority: payload.priority, horizon: payload.horizon, date: payload.date, completedAt, completedOn, completionHistory: nextHistory, done } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = getOwnerId(request);
  if (!userId) return unauthorizedResponse();
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const id = Number(url.searchParams.get("id"));
    const tables: Record<string, string> = {
      application: "applications",
      project: "projects",
      "quick-note": "quick_notes",
      reminder: "reminders",
    };
    const table = type ? tables[type] : undefined;
    if (!table || !Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "invalid item" }, { status: 400 });
    }
    const deleted = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`)
      .bind(id, userId).run();
    if (!deleted.meta.changes) {
      return Response.json({ error: "item not found" }, { status: 404 });
    }
    return Response.json({ deleted: true, id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "delete failed" }, { status: 500 });
  }
}
