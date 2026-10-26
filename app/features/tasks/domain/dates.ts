export type TaskHorizon = "今日" | "本周" | "年度";
export type PeriodScopedTask = {
    horizon: string;
    activeOn?: string | null;
    completedOn?: string | null;
    done?: boolean;
};
export function shanghaiDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}
function parseDateKey(dateKey: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))
        return null;
    const date = new Date(`${dateKey}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}
export function taskPeriodStartKey(horizon: string, dateKey = shanghaiDateKey()) {
    const date = parseDateKey(dateKey);
    if (!date || horizon === "今日")
        return dateKey;
    if (horizon === "年度")
        return `${dateKey.slice(0, 4)}-01-01`;
    if (horizon !== "本周")
        return dateKey;
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return date.toISOString().slice(0, 10);
}
function taskReferenceDate(task: PeriodScopedTask) {
    return task.activeOn || task.completedOn || "";
}
export function isTaskCarriedOver(task: PeriodScopedTask, today = shanghaiDateKey()) {
    if (task.done || !["本周", "年度"].includes(task.horizon))
        return false;
    const referenceDate = taskReferenceDate(task);
    if (!referenceDate)
        return false;
    return (taskPeriodStartKey(task.horizon, referenceDate) <
        taskPeriodStartKey(task.horizon, today));
}
export function isTaskVisibleOnDay(task: PeriodScopedTask, today = shanghaiDateKey()) {
    const referenceDate = taskReferenceDate(task);
    if (task.horizon === "今日")
        return referenceDate === today;
    if (!["本周", "年度"].includes(task.horizon) || !referenceDate)
        return true;
    const isCurrentPeriod = taskPeriodStartKey(task.horizon, referenceDate) >=
        taskPeriodStartKey(task.horizon, today);
    return isCurrentPeriod || !task.done;
}
export function visibleTasksForDay<T extends PeriodScopedTask>(tasks: T[], today = shanghaiDateKey()) {
    return tasks.filter((task) => isTaskVisibleOnDay(task, today));
}
