"use client";
import { WeeklyReview } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "view" | "currentTaskDay" | "tasks" | "knowledge">;
};
export function WeeklyReviewView({ controller }: Props) {
    const { view, currentTaskDay, tasks, knowledge } = controller;
    return <>{view === "每周总结" && <WeeklyReview today={currentTaskDay} tasks={tasks} knowledge={knowledge}/>}</>;
}
