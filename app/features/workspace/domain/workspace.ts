import { projectDueDateInputValue } from './projectDates';
export type SearchEntry = {
    id: number;
    kind: '任务' | '项目' | '笔记' | '资料';
    title: string;
    detail: string;
    content?: string;
};
export function searchWorkspace(entries: SearchEntry[], query: string) {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length)
        return [];
    return entries.filter(entry => words.every(word => `${entry.title} ${entry.detail} ${entry.content || ''}`.toLocaleLowerCase().includes(word)))
        .sort((a, b) => Number(b.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())) - Number(a.title.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())));
}
export function conciseSummary(title: string, summary: string, length = 130) {
    const text = summary.replaceAll(title, '').replace(/\s+/g, ' ').trim();
    const parts = [...new Set(text.split(/(?<=[。；！？])/).map(part => part.trim()).filter(Boolean))];
    const result = parts.join('');
    return result.length > length ? `${result.slice(0, length).replace(/[，、；\s]+$/, '')}…` : result;
}
export function dayOffset(date: string, origin: string) {
    return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${origin}T00:00:00Z`)) / 86400000);
}
export function projectTimeline(project: {
    startDate?: string;
    dueDate: string;
}, today: string) {
    const start = projectDueDateInputValue(project.startDate);
    const due = projectDueDateInputValue(project.dueDate);
    if (!due || !start)
        return { state: 'unscheduled' as const, start: 0, span: 0 };
    if (due < start)
        return { state: 'invalid' as const, start: 0, span: 0 };
    if (due < today)
        return { state: 'overdue' as const, start: 0, span: 0 };
    const offset = dayOffset(start, today);
    if (offset > 13)
        return { state: 'future' as const, start: 0, span: 0 };
    const left = Math.max(0, offset);
    return { state: 'scheduled' as const, start: left, span: Math.min(13, dayOffset(due, today)) - left + 1 };
}
export function projectMetrics<T extends {
    id: number;
    progress: number;
    remainingTasks: number;
    progressMode?: string;
}>(project: T, tasks: {
    projectId?: number | null;
    done: boolean;
}[]) {
    const linked = tasks.filter(task => task.projectId === project.id);
    return { ...project, remainingTasks: linked.length ? linked.filter(task => !task.done).length : project.remainingTasks,
        progress: project.progressMode === 'auto' ? (linked.length ? Math.round(linked.filter(task => task.done).length / linked.length * 100) : 0) : project.progress };
}
export type FocusSession = {
    duration: number;
    remaining: number;
    endsAt: number | null;
    sessionId: string;
    completed: number;
    taskId?: number | null;
    taskTitle?: string;
};
export const EMPTY_FOCUS: FocusSession = { duration: 25, remaining: 1500, endsAt: null, sessionId: '', completed: 0 };
export function focusSeconds(session: FocusSession, now: number) {
    return session.endsAt === null ? session.remaining : Math.max(0, Math.ceil((session.endsAt - now) / 1000));
}
export function formatStoredDate(value: string) {
    if (!value || /刚刚|今天|昨天/.test(value))
        return '历史收录';
    if (value === '基础知识库' || value === '内置资料')
        return '内置资料';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric' }).format(date);
}
