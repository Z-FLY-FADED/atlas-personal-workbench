import { shanghaiDateKey, taskPeriodStartKey } from "../../tasks/domain/dates";
export type ReviewTask = {
    id: number;
    title: string;
    completionHistory?: {
        completedOn: string;
    }[];
};
export type ReviewKnowledge = {
    id: number;
    title: string;
    createdAt: string;
    sourceType?: string;
    stableKey?: string;
};
export type FocusRecord = {
    id: string;
    minutes: number;
    completedAt: string;
};
export function dateKey(value: string) {
    if (!value || /今天|昨天|刚刚|内置|基础知识/.test(value))
        return '';
    const local = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s|$)/.exec(value);
    if (local) {
        const day = `${local[1]}-${local[2].padStart(2, '0')}-${local[3].padStart(2, '0')}`;
        return isDateKey(day) ? day : '';
    }
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? '' : shanghaiDateKey(time);
}
export function addDays(day: string, days: number) {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
export function isDateKey(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function summarizeWeek(day: string, tasks: ReviewTask[], knowledge: ReviewKnowledge[], focus: FocusRecord[]) {
    const start = taskPeriodStartKey('本周', day), end = addDays(start, 6);
    const inside = (date: string) => Boolean(date) && date >= start && date <= end;
    const completed = tasks.filter(task => task.completionHistory?.some(entry => inside(entry.completedOn)));
    const personal = knowledge.filter(item => !item.stableKey?.startsWith('builtin:') && item.sourceType !== '内置资料');
    const added = personal.filter(item => inside(dateKey(item.createdAt)));
    const sessions = [...new Map(focus.map(item => [item.id, item])).values()].filter(item => inside(dateKey(item.completedAt)) && Number.isFinite(item.minutes) && item.minutes > 0);
    return { start, end, completed: completed.map(({ id, title }) => ({ id, title })), added: added.map(({ id, title }) => ({ id, title })), focusMinutes: Math.round(sessions.reduce((sum, item) => sum + item.minutes, 0) * 10) / 10, focusCount: sessions.length, undatedKnowledge: personal.filter(item => !dateKey(item.createdAt)).length };
}
export function reviewDraft(summary: ReturnType<typeof summarizeWeek>) {
    return `# 周报 · ${summary.start} 至 ${summary.end}\n\n## 本周记录\n\n- 完成任务：${summary.completed.length} 项\n- 新增资料：${summary.added.length} 条\n- 专注：${summary.focusMinutes} 分钟，${summary.focusCount} 次\n\n## 已完成任务\n\n${summary.completed.map(item => `- ${item.title}`).join('\n') || '暂无完成记录。'}\n\n## 新增资料\n\n${summary.added.map(item => `- ${item.title}`).join('\n') || '暂无新增记录。'}\n\n## 本周亮点\n\n\n## 遇到的问题\n\n\n## 下周计划\n\n`;
}
