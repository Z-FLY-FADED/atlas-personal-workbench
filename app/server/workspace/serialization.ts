import type { TaskCompletion } from "../../contracts/workspace";
import { projectDueDateInputValue } from "../../features/workspace/domain/projectDates";
export function shanghaiTimestamp(date = new Date()) {
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
export function taskFields(payload: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => !['type', 'action', 'subtasks'].includes(key)));
}
export function parseCompletionHistory(value: unknown): TaskCompletion[] {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(parsed))
            return [];
        return parsed.flatMap((item) => {
            if (!item || typeof item !== "object")
                return [];
            const entry = item as Record<string, unknown>;
            const completedAt = String(entry.completedAt || "").trim();
            const completedOn = String(entry.completedOn || "").trim();
            if (!completedAt && !completedOn)
                return [];
            return [{ id: String(entry.id || `${completedOn}-${completedAt}`), completedAt, completedOn }];
        });
    }
    catch {
        return [];
    }
}
export function parseStringArray(value: unknown) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? [...new Set(parsed.map(String).map((item) => item.trim()).filter(Boolean))] : [];
    }
    catch {
        return [];
    }
}
export function parseNumberArray(value: unknown) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? [...new Set(parsed.map(Number).filter((item) => Number.isFinite(item) && item > 0))] : [];
    }
    catch {
        return [];
    }
}
export function projectSchedule(payload: Record<string, unknown>) {
    const startDate = projectDueDateInputValue(String(payload.startDate || ''));
    const dueDate = projectDueDateInputValue(String(payload.dueDate || ''));
    const milestoneDate = projectDueDateInputValue(String(payload.milestoneDate || ''));
    if (startDate && dueDate && startDate > dueDate)
        throw new Error('截止日期不能早于开始日期');
    return { startDate, milestoneDate, progressMode: payload.progressMode === 'auto' ? 'auto' : 'manual' };
}
