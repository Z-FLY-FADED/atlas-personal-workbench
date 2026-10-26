"use client";
import { useState } from "react";
import type { UserProfile } from "../../../contracts/workspace";
import type { WorkspaceReminder } from "../components/WorkspaceOverview";
import type { WorkspaceProjectRecord, WorkspaceQuickNote } from "../components/WorkspacePages";
export function useCollectionsState() {
    const [editingNote, setEditingNote] = useState<WorkspaceQuickNote | null>(null);
    const [reminderOpen, setReminderOpen] = useState(false);
    const [reminderDay, setReminderDay] = useState('');
    const [workspaceProjects, setWorkspaceProjects] = useState<WorkspaceProjectRecord[]>([]);
    const [quickNotes, setQuickNotes] = useState<WorkspaceQuickNote[]>([]);
    const [workspaceReminders, setWorkspaceReminders] = useState<WorkspaceReminder[]>([]);
    const [projectModal, setProjectModal] = useState(false);
    const [noteModal, setNoteModal] = useState(false);
    const [editingProject, setEditingProject] = useState<WorkspaceProjectRecord | null>(null);
    const [profile, setProfile] = useState<UserProfile>({
        displayName: "用户名",
        motto: "专注 · 自洽 · 成长",
        avatarText: "用",
        accent: "gold",
    });
    const [profileModal, setProfileModal] = useState(false);
    return { editingNote, setEditingNote, reminderOpen, setReminderOpen, reminderDay, setReminderDay, workspaceProjects, setWorkspaceProjects, quickNotes, setQuickNotes, workspaceReminders, setWorkspaceReminders, projectModal, setProjectModal, noteModal, setNoteModal, editingProject, setEditingProject, profile, setProfile, profileModal, setProfileModal };
}
