"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { WorkspaceProjectsPage } from "../components/WorkspacePages";
import { projectMetrics } from "../domain/workspace";
type Props = {
    controller: Pick<WorkspaceController, "view" | "workspaceProjects" | "tasks" | "currentTaskDay" | "setEditingProject" | "setProjectModal">;
};
export function ProjectsView({ controller }: Props) {
    const { view, workspaceProjects, tasks, currentTaskDay, setEditingProject, setProjectModal } = controller;
    return <>{view === "项目" && (<WorkspaceProjectsPage projects={workspaceProjects.map(item => projectMetrics(item, tasks))} today={currentTaskDay} onNew={() => {
                setEditingProject(null);
                setProjectModal(true);
            }} onEdit={(project) => {
                setEditingProject(project);
                setProjectModal(true);
            }}/>)}</>;
}
