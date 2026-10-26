"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { WorkspaceNotesPage } from "../components/WorkspacePages";
type Props = {
    controller: Pick<WorkspaceController, "view" | "quickNotes" | "setEditingNote" | "setNoteModal" | "convertNote" | "updateQuickNote">;
};
export function NotesView({ controller }: Props) {
    const { view, quickNotes, setEditingNote, setNoteModal, convertNote, updateQuickNote } = controller;
    return <>{view === "笔记" && (<WorkspaceNotesPage notes={quickNotes} onNew={() => { setEditingNote(null); setNoteModal(true); }} onEdit={note => { setEditingNote(note); setNoteModal(true); }} onConvert={convertNote} onUpdate={updateQuickNote}/>)}</>;
}
