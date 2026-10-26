"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { WorkspaceReminders } from "./WorkspaceWidgets";
type Props = {
    controller: Pick<WorkspaceController, "reminderOpen" | "reminderDay" | "workspaceReminders" | "setReminderOpen" | "saveReminder" | "toggleReminder">;
};
export function ReminderDialog({ controller }: Props) {
    const { reminderOpen, reminderDay, workspaceReminders, setReminderOpen, saveReminder, toggleReminder } = controller;
    return <>{reminderOpen && <WorkspaceReminders day={reminderDay} items={workspaceReminders} onClose={() => setReminderOpen(false)} onSave={saveReminder} onToggle={toggleReminder}/>}</>;
}
