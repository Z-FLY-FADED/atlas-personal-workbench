import { env } from "cloudflare:workers";
import { enrichKnowledge, parseKnowledgeEnrichment } from "../../features/knowledge/domain/enrichment";
import { analyzeKnowledgeContent, rankKnowledgeRelations } from "../../features/knowledge/domain/intelligence";
import { shanghaiDateKey, taskPeriodStartKey } from "../../features/tasks/domain/dates";
import { getOwnerId, unauthorizedResponse } from "../auth";
import { parseCompletionHistory, parseNumberArray, parseStringArray } from './serialization';
export async function GET(request: Request) {
    const userId = getOwnerId(request);
    if (!userId)
        return unauthorizedResponse();
    try {
        const today = shanghaiDateKey();
        await env.DB.prepare(`UPDATE tasks
      SET active_on = CASE horizon
        WHEN '今日' THEN ?
        WHEN '本周' THEN ?
        WHEN '年度' THEN ?
        ELSE ?
      END
      WHERE owner_id = ? AND done = 0 AND active_on = ''`)
            .bind(today, taskPeriodStartKey("本周", today), taskPeriodStartKey("年度", today), today, userId)
            .run();
        const [taskResult, knowledgeResult, applicationResult, profileResult, resumeResult, projectResult, noteResult, reminderResult, preferenceResult] = await env.DB.batch<Record<string, unknown>>([
            env.DB.prepare("SELECT id, title, detail, priority, horizon, done, date, completed_at AS completedAt, completed_on AS completedOn, completion_history AS completionHistory, active_on AS activeOn, project_id AS projectId, repeat_rule AS repeatRule FROM tasks WHERE owner_id = ? ORDER BY id DESC").bind(userId),
            env.DB.prepare("SELECT id, title, summary, content, primary_category AS primaryCategory, secondary_category AS secondaryCategory, confidence, source, source_type AS sourceType, created_at AS createdAt, completeness, enrichment, keywords, related_ids AS relatedIds, related_topics AS relatedTopics FROM knowledge WHERE owner_id = ? ORDER BY id DESC").bind(userId),
            env.DB.prepare("SELECT id, company, role, status, channel, applied_at AS appliedAt, next_action AS nextAction, notes FROM applications WHERE owner_id = ? ORDER BY id DESC").bind(userId),
            env.DB.prepare("SELECT display_name AS displayName, motto, avatar_text AS avatarText, accent, updated_at AS updatedAt FROM profiles WHERE owner_id = ? LIMIT 1").bind(userId),
            env.DB.prepare("SELECT file_name AS fileName, content, updated_at AS updatedAt FROM resumes WHERE owner_id = ? LIMIT 1").bind(userId),
            env.DB.prepare("SELECT id, title, stage, status, progress, next_milestone AS nextMilestone, due_date AS dueDate, start_date AS startDate, milestone_date AS milestoneDate, progress_mode AS progressMode, remaining_tasks AS remainingTasks, accent, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE owner_id = ? ORDER BY CASE status WHEN '进行中' THEN 0 ELSE 1 END, updated_at DESC, id DESC").bind(userId),
            env.DB.prepare("SELECT id, content, status, created_at AS createdAt, updated_at AS updatedAt FROM quick_notes WHERE owner_id = ? ORDER BY updated_at DESC, id DESC").bind(userId),
            env.DB.prepare("SELECT id, title, remind_at AS remindAt, done, created_at AS createdAt FROM reminders WHERE owner_id = ? ORDER BY done ASC, remind_at ASC").bind(userId),
            env.DB.prepare("SELECT knowledge_key AS knowledgeKey, primary_category AS primaryCategory, secondary_category AS secondaryCategory, cover FROM knowledge_preferences WHERE owner_id = ?").bind(userId),
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
                id: Number(item.id), title, summary, content, enrichment: item.enrichment,
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
            knowledgePreferences: preferenceResult.results,
            reminders: reminderResult.results.map((reminder) => ({ ...reminder, done: Boolean(reminder.done) })),
        });
    }
    catch (error) {
        console.error("workspace GET failed", error);
        return Response.json({ error: "workspace unavailable" }, { status: 503 });
    }
}
