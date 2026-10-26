"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { findKnowledge } from "../../knowledge/domain/identity";
import { WorkspaceEntryModals } from "./WorkspacePages";
type Props = {
    controller: Pick<WorkspaceController, "knowledge" | "setProjectModal" | "setEditingProject" | "setSelectedKnowledge" | "projectModal" | "noteModal" | "editingProject" | "editingNote" | "tasks" | "openTaskEditor" | "setNoteModal" | "saveWorkspaceProject" | "saveQuickNote">;
};
export function CollectionDialogs({ controller }: Props) {
    const { knowledge, setProjectModal, setEditingProject, setSelectedKnowledge, projectModal, noteModal, editingProject, editingNote, tasks, openTaskEditor, setNoteModal, saveWorkspaceProject, saveQuickNote } = controller;
    return <><WorkspaceEntryModals knowledge={knowledge} onOpenKnowledge={key => {
            const item = findKnowledge(knowledge, key);
            if (item) {
                setProjectModal(false);
                setEditingProject(null);
                setSelectedKnowledge(item);
            }
        }} projectOpen={projectModal} noteOpen={noteModal} project={editingProject} note={editingNote} tasks={tasks} onEditTask={id => {
            const task = tasks.find(item => item.id === id);
            if (task) {
                setProjectModal(false);
                openTaskEditor(task);
            }
        }} onClose={() => {
            setProjectModal(false);
            setNoteModal(false);
            setEditingProject(null);
        }} onSaveProject={saveWorkspaceProject} onSaveNote={content => saveQuickNote(content, editingNote)}/></>;
}
