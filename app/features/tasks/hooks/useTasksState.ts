"use client";
import { useState } from "react";
import type { Horizon, Task } from "../../../contracts/workspace";
import { initialTasks } from "../../workspace/domain/initialState";
import { shanghaiDateKey } from "../domain/dates";
export function useTasksState() {
    const [horizon, changeHorizon] = useState<Horizon>("今日");
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [currentTaskDay, setCurrentTaskDay] = useState(shanghaiDateKey);
    const [taskDraftHorizon, setTaskDraftHorizon] = useState<Horizon>('今日');
    const [taskSeed, setTaskSeed] = useState({ title: '', detail: '' });
    const [taskModal, setTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [undoTask, setUndoTask] = useState<Task | null>(null);
    const [taskHistoryOpen, setTaskHistoryOpen] = useState(false);
    return { horizon, changeHorizon, tasks, setTasks, currentTaskDay, setCurrentTaskDay, taskDraftHorizon, setTaskDraftHorizon, taskSeed, setTaskSeed, taskModal, setTaskModal, editingTask, setEditingTask, undoTask, setUndoTask, taskHistoryOpen, setTaskHistoryOpen };
}
