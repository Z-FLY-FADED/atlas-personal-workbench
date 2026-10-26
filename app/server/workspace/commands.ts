import { env } from "cloudflare:workers";
import { enrichKnowledge } from "../../features/knowledge/domain/enrichment";
import { analyzeKnowledgeContent, rankKnowledgeRelations } from "../../features/knowledge/domain/intelligence";
import { KNOWLEDGE_TAXONOMY } from "../../features/knowledge/domain/taxonomy";
import { REPEAT_RULES, validDate, type RepeatRule } from "../../features/planning/domain/planning";
import { shanghaiDateKey, taskPeriodStartKey } from "../../features/tasks/domain/dates";
import { getOwnerId, unauthorizedResponse } from "../auth";
import { recycleRecord } from "../data/archive";
import { recurrenceStatements } from "../planning/recurrence";
import { parseCompletionHistory, parseNumberArray, parseStringArray, projectSchedule, shanghaiTimestamp, taskFields } from './serialization';
import { crawlPublicSource } from './webSources';
import { readRuntimePolicy } from '../runtime/policy';
export async function POST(request: Request) {
    const userId = getOwnerId(request);
    if (!userId)
        return unauthorizedResponse();
    try {
        const payload = await request.json() as Record<string, unknown>;
        if (payload.type === "task") {
            const completed = Boolean(payload.done);
            const completedAt = completed ? String(payload.completedAt ?? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())) : "";
            const completedOn = completed ? String(payload.completedOn ?? shanghaiDateKey()) : "";
            const completionHistory = completed ? JSON.stringify([{ id: `${Date.now()}`, completedAt, completedOn }]) : "[]";
            const projectId = Number(payload.projectId) > 0 ? Number(payload.projectId) : null;
            const horizon = String(payload.horizon ?? "今日");
            if (!["今日", "本周", "年度"].includes(horizon))
                return Response.json({ error: "请选择有效的任务周期" }, { status: 400 });
            const repeatRule = String(payload.repeatRule || 'none') as RepeatRule;
            if (!Object.hasOwn(REPEAT_RULES, repeatRule) || (repeatRule !== 'none' && horizon !== '今日'))
                return Response.json({ error: '重复任务请选择“今日”时间范围' }, { status: 400 });
            const activeOn = validDate(String(payload.activeOn)) ? String(payload.activeOn) : taskPeriodStartKey(horizon);
            const instanceKey = crypto.randomUUID();
            const subtasks = String(payload.subtasks || '').split('\n').map(t => t.trim().slice(0, 200)).filter(Boolean).slice(0, 100);
            const results = await env.DB.batch([
                env.DB.prepare("INSERT INTO tasks (owner_id, title, detail, priority, horizon, done, date, completed_at, completed_on, completion_history, active_on, project_id,repeat_rule,recurrence_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)")
                    .bind(userId, String(payload.title ?? "未命名任务"), String(payload.detail ?? ""), String(payload.priority ?? "一般"), horizon, completed ? 1 : 0, String(payload.date ?? "待安排"), completedAt, completedOn, completionHistory, activeOn, projectId, repeatRule, instanceKey),
                ...subtasks.map((title, position) => env.DB.prepare('INSERT INTO task_subtasks (id,owner_id,task_id,title,position) SELECT ?,owner_id,id,?,? FROM tasks WHERE owner_id=? AND recurrence_key=?').bind(crypto.randomUUID(), title, position, userId, instanceKey)),
            ]);
            return Response.json({ item: { ...taskFields(payload), id: results[0].meta.last_row_id, repeatRule, horizon, activeOn, projectId, done: completed, completedAt, completedOn, completionHistory: parseCompletionHistory(completionHistory) } }, { status: 201 });
        }
        if (payload.type === "project") {
            const schedule = projectSchedule(payload);
            const title = String(payload.title ?? "未命名项目").trim().slice(0, 80) || "未命名项目";
            const stage = String(payload.stage ?? "规划中").trim().slice(0, 30) || "规划中";
            const status = ["进行中", "已暂停", "已完成"].includes(String(payload.status)) ? String(payload.status) : "进行中";
            const progress = Math.min(100, Math.max(0, Math.round(Number(payload.progress) || 0)));
            const nextMilestone = String(payload.nextMilestone ?? "确定下一里程碑").trim().slice(0, 100) || "确定下一里程碑";
            const dueDate = String(payload.dueDate ?? "待安排").trim().slice(0, 40) || "待安排";
            const remainingTasks = Math.max(0, Math.round(Number(payload.remainingTasks) || 0));
            const accent = /^#[0-9a-f]{6}$/i.test(String(payload.accent)) ? String(payload.accent) : "#a97d30";
            const timestamp = shanghaiTimestamp();
            const result = await env.DB.prepare("INSERT INTO projects (owner_id, title, stage, status, progress, next_milestone, due_date, remaining_tasks, accent, created_at, updated_at, start_date, milestone_date, progress_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(userId, title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, timestamp, timestamp, schedule.startDate, schedule.milestoneDate, schedule.progressMode).run();
            return Response.json({ item: { id: result.meta.last_row_id, title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, ...schedule, createdAt: timestamp, updatedAt: timestamp } }, { status: 201 });
        }
        if (payload.type === "quick-note") {
            const content = String(payload.content ?? "").replace(/\u0000/g, "").trim().slice(0, 6000);
            if (!content)
                return Response.json({ error: "速记内容不能为空" }, { status: 400 });
            const timestamp = shanghaiTimestamp();
            const result = await env.DB.prepare("INSERT INTO quick_notes (owner_id, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
                .bind(userId, content, "待整理", timestamp, timestamp).run();
            return Response.json({ item: { id: result.meta.last_row_id, content, status: "待整理", createdAt: timestamp, updatedAt: timestamp } }, { status: 201 });
        }
        if (payload.type === "reminder") {
            const title = String(payload.title ?? "新提醒").trim().slice(0, 100) || "新提醒";
            const remindAt = String(payload.remindAt ?? "").trim().slice(0, 40);
            if (!remindAt)
                return Response.json({ error: "提醒时间不能为空" }, { status: 400 });
            const timestamp = shanghaiTimestamp();
            const result = await env.DB.prepare("INSERT INTO reminders (owner_id, title, remind_at, done, created_at) VALUES (?, ?, ?, 0, ?)")
                .bind(userId, title, remindAt, timestamp).run();
            return Response.json({ item: { id: result.meta.last_row_id, title, remindAt, done: false, createdAt: timestamp } }, { status: 201 });
        }
        if (payload.type === "knowledge") {
            const rawContent = String(payload.content ?? "");
            const policy = await readRuntimePolicy(env.DB, userId);
            const crawled = String(payload.sourceType) === '网址' && policy.mode !== 'offline' ? await crawlPublicSource(rawContent) : null;
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
                .bind(userId, title, summary, content, secondaryCategory, primaryCategory, secondaryCategory, confidence, crawled?.host || String(payload.source ?? "手动"), String(payload.sourceType ?? "手动输入"), new Date().toISOString(), enrichment.completeness, JSON.stringify(enrichment), JSON.stringify(keywords), JSON.stringify(relatedIds), JSON.stringify(relatedTopics))
                .run();
            const id = Number(result.meta.last_row_id);
            const reciprocalUpdates = relations.flatMap((relation) => {
                const item = existing.find((entry) => entry.id === relation.id);
                if (!item)
                    return [];
                const reciprocalIds = [...new Set([id, ...item.relatedIds])].slice(0, 8);
                return [env.DB.prepare("UPDATE knowledge SET related_ids = ? WHERE owner_id = ? AND id = ?").bind(JSON.stringify(reciprocalIds), userId, item.id)];
            });
            if (reciprocalUpdates.length)
                await env.DB.batch(reciprocalUpdates);
            return Response.json({ item: { ...payload, id, title, summary, content, source: crawled?.host || payload.source, crawledUrl: crawled?.url, primaryCategory, secondaryCategory, confidence, keywords, relatedTopics, relatedIds, enrichment, completeness: enrichment.completeness } }, { status: 201 });
        }
        if (payload.type === "resume") {
            const fileName = String(payload.fileName ?? "个人简历").trim().slice(0, 180) || "个人简历";
            const content = String(payload.content ?? "").replace(/\u0000/g, "").trim().slice(0, 100000);
            if (content.length < 50)
                return Response.json({ error: "简历内容过短" }, { status: 400 });
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
    }
    catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
    }
}
export async function PATCH(request: Request) {
    const userId = getOwnerId(request);
    if (!userId)
        return unauthorizedResponse();
    try {
        const payload = await request.json() as {
            type?: string;
            action?: string;
            id?: number;
            done?: boolean;
            title?: string;
            detail?: string;
            priority?: string;
            horizon?: string;
            date?: string;
            activeOn?: string;
            completedAt?: string;
            completedOn?: string;
            company?: string;
            role?: string;
            status?: string;
            channel?: string;
            appliedAt?: string;
            nextAction?: string;
            notes?: string;
            displayName?: string;
            motto?: string;
            avatarText?: string;
            accent?: string;
            updatedAt?: string;
            content?: string;
            stage?: string;
            progress?: number;
            nextMilestone?: string;
            dueDate?: string;
            remainingTasks?: number;
            remindAt?: string;
            projectId?: number | null;
            startDate?: string;
            milestoneDate?: string;
            progressMode?: string;
            knowledgeKey?: string;
            primaryCategory?: string;
            secondaryCategory?: string;
            cover?: string;
            repeatRule?: string;
        };
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
            const schedule = projectSchedule(payload);
            const title = String(payload.title ?? "未命名项目").trim().slice(0, 80) || "未命名项目";
            const stage = String(payload.stage ?? "规划中").trim().slice(0, 30) || "规划中";
            const status = ["进行中", "已暂停", "已完成"].includes(String(payload.status)) ? String(payload.status) : "进行中";
            const progress = Math.min(100, Math.max(0, Math.round(Number(payload.progress) || 0)));
            const nextMilestone = String(payload.nextMilestone ?? "确定下一里程碑").trim().slice(0, 100) || "确定下一里程碑";
            const dueDate = String(payload.dueDate ?? "待安排").trim().slice(0, 40) || "待安排";
            const remainingTasks = Math.max(0, Math.round(Number(payload.remainingTasks) || 0));
            const accent = /^#[0-9a-f]{6}$/i.test(String(payload.accent)) ? String(payload.accent) : "#a97d30";
            const updatedAt = shanghaiTimestamp();
            const updated = await env.DB.prepare("UPDATE projects SET title = ?, stage = ?, status = ?, progress = ?, next_milestone = ?, due_date = ?, remaining_tasks = ?, accent = ?, updated_at = ?, start_date = ?, milestone_date = ?, progress_mode = ? WHERE id = ? AND owner_id = ?")
                .bind(title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, updatedAt, schedule.startDate, schedule.milestoneDate, schedule.progressMode, payload.id, userId).run();
            if (!updated.meta.changes)
                return Response.json({ error: "project not found" }, { status: 404 });
            return Response.json({ item: { id: payload.id, title, stage, status, progress, nextMilestone, dueDate, remainingTasks, accent, ...schedule, updatedAt }, updated: true });
        }
        if (payload.type === "quick-note" && payload.id) {
            const content = String(payload.content ?? "").replace(/\u0000/g, "").trim().slice(0, 6000);
            const status = ["待整理", "已整理", "已归档"].includes(String(payload.status)) ? String(payload.status) : "待整理";
            if (!content)
                return Response.json({ error: "速记内容不能为空" }, { status: 400 });
            const updatedAt = shanghaiTimestamp();
            const updated = await env.DB.prepare("UPDATE quick_notes SET content = ?, status = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
                .bind(content, status, updatedAt, payload.id, userId).run();
            if (!updated.meta.changes)
                return Response.json({ error: "note not found" }, { status: 404 });
            return Response.json({ item: { id: payload.id, content, status, updatedAt }, updated: true });
        }
        if (payload.type === "reminder" && payload.id) {
            const done = Boolean(payload.done);
            const updated = await env.DB.prepare("UPDATE reminders SET done = ? WHERE id = ? AND owner_id = ?")
                .bind(done ? 1 : 0, payload.id, userId).run();
            if (!updated.meta.changes)
                return Response.json({ error: "reminder not found" }, { status: 404 });
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
        if (payload.type === "knowledge-preference") {
            const knowledgeKey = String(payload.knowledgeKey || '').trim().slice(0, 400);
            const category = KNOWLEDGE_TAXONOMY.find(item => item.name === payload.primaryCategory);
            if (!knowledgeKey || !category || !['auto', 'none', 'mechanical', 'electrical', 'embedded'].includes(String(payload.cover)))
                return Response.json({ error: '分类或封面设置无效' }, { status: 400 });
            await env.DB.prepare('INSERT INTO knowledge_preferences (owner_id, knowledge_key, primary_category, secondary_category, cover) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_id, knowledge_key) DO UPDATE SET primary_category = excluded.primary_category, secondary_category = excluded.secondary_category, cover = excluded.cover').bind(userId, knowledgeKey, payload.primaryCategory, String(payload.secondaryCategory || '').slice(0, 80), payload.cover).run();
            return Response.json({ updated: true });
        }
        if (payload.type !== "task" || !payload.id)
            return Response.json({ error: "invalid task" }, { status: 400 });
        if (payload.action === "edit") {
            const projectId = Number(payload.projectId) > 0 ? Number(payload.projectId) : null;
            const horizon = String(payload.horizon ?? "今日");
            const activeOn = String(payload.activeOn || taskPeriodStartKey(horizon));
            const repeatRule = String(payload.repeatRule || 'none') as RepeatRule;
            if (!['今日', '本周', '年度'].includes(horizon) || !validDate(activeOn) || !Object.hasOwn(REPEAT_RULES, repeatRule) || (repeatRule !== 'none' && horizon !== '今日'))
                return Response.json({ error: '请检查日期，重复任务请选择“今日”时间范围' }, { status: 400 });
            const updated = await env.DB.prepare("UPDATE tasks SET title = ?, detail = ?, priority = ?, horizon = ?, date = ?, active_on = ?, project_id = ?,repeat_rule=? WHERE id = ? AND owner_id = ?")
                .bind(String(payload.title ?? "未命名任务"), String(payload.detail ?? ""), String(payload.priority ?? "一般"), horizon, String(payload.date ?? "待安排"), activeOn, projectId, repeatRule, payload.id, userId).run();
            if (!updated.meta.changes) {
                return Response.json({ error: '任务不存在，请刷新后重试' }, { status: 404 });
            }
            return Response.json({ item: { ...taskFields(payload), id: payload.id, repeatRule, horizon, activeOn, projectId, done: Boolean(payload.done) } });
        }
        const current = await env.DB.prepare("SELECT title,detail,priority,horizon,date,project_id AS projectId,done,repeat_rule AS repeatRule,completion_history AS completionHistory, active_on AS activeOn FROM tasks WHERE id = ? AND owner_id = ? LIMIT 1").bind(payload.id, userId).first<Record<string, unknown>>();
        if (!current)
            return Response.json({ error: '任务不存在，请刷新后重试' }, { status: 404 });
        const history = parseCompletionHistory((current as Record<string, unknown> | null)?.completionHistory);
        const activeOn = String((current as Record<string, unknown> | null)?.activeOn || payload.activeOn || "");
        const done = Boolean(payload.done);
        const completedAt = done ? String(payload.completedAt ?? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())) : "";
        const completedOn = done ? String(payload.completedOn ?? shanghaiDateKey()) : "";
        const nextHistory = Boolean(current.done) === done ? history : done ? [...history, { id: crypto.randomUUID(), completedAt, completedOn }] : history.slice(0, -1);
        const repeatRule = current.repeatRule as RepeatRule;
        await env.DB.batch([
            ...(done ? recurrenceStatements(env.DB, userId, Number(payload.id), repeatRule, activeOn, shanghaiDateKey()) : []),
            env.DB.prepare("UPDATE tasks SET done = ?, completed_at = ?, completed_on = ?, completion_history = ? WHERE id = ? AND owner_id = ? AND done=?")
                .bind(done ? 1 : 0, completedAt, completedOn, JSON.stringify(nextHistory), payload.id, userId, done ? 0 : 1),
        ]);
        return Response.json({ item: { ...current, id: payload.id, activeOn, completedAt: done ? nextHistory.at(-1)?.completedAt || completedAt : '', completedOn: done ? nextHistory.at(-1)?.completedOn || completedOn : '', completionHistory: nextHistory, done }, recurring: done && repeatRule !== 'none' });
    }
    catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 500 });
    }
}
export async function DELETE(request: Request) {
    const userId = getOwnerId(request);
    if (!userId)
        return unauthorizedResponse();
    try {
        const url = new URL(request.url);
        const type = url.searchParams.get("type");
        const id = Number(url.searchParams.get("id"));
        const tables: Record<string, string> = {
            task: "tasks",
            application: "applications",
            project: "projects",
            "quick-note": "quick_notes",
            reminder: "reminders",
        };
        const table = type ? tables[type] : undefined;
        if (!table || !Number.isInteger(id) || id <= 0) {
            return Response.json({ error: "invalid item" }, { status: 400 });
        }
        const deleted = await recycleRecord(env.DB, userId, type!, id);
        if (!deleted) {
            return Response.json({ error: "item not found" }, { status: 404 });
        }
        return Response.json({ deleted: true, id });
    }
    catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "delete failed" }, { status: 500 });
    }
}
