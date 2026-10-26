"use client";
import { useMemo } from "react";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
import { visibleTasksForDay } from "../domain/dates";
type Dependencies = Pick<WorkspaceState, "tasks" | "currentTaskDay" | "horizon">;
export function useTaskSelectors(dependencies: Dependencies) {
    const { tasks, currentTaskDay, horizon } = dependencies;
    const visibleTasks = useMemo(() => visibleTasksForDay(tasks, currentTaskDay), [tasks, currentTaskDay]);
    const filteredTasks = useMemo(() => visibleTasks.filter((task) => task.horizon === horizon && !task.done), [visibleTasks, horizon]);
    const completedHistory = useMemo(() => tasks
        .flatMap((task) => (task.completionHistory || []).map((entry, index) => ({
        ...entry,
        taskId: task.id,
        title: task.title,
        detail: task.detail,
        horizon: task.horizon,
        historyIndex: index,
    })))
        .sort((a, b) => b.completedOn.localeCompare(a.completedOn) ||
        b.completedAt.localeCompare(a.completedAt)), [tasks]);
    const activeCompleted = visibleTasks.filter((task) => task.done).length;
    const completed = completedHistory.length;
    return { visibleTasks, filteredTasks, completedHistory, activeCompleted, completed };
}
export type TaskSelectorsResult = ReturnType<typeof useTaskSelectors>;
