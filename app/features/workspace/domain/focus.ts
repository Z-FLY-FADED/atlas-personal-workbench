import { apiJson } from "../../../shared/api/workspaceClient";
import { readLocal, writeLocal } from "../../../shared/hooks/useWorkspaceIO";
import type { FocusSession } from "./workspace";
export type StoredFocus = {
    id: string;
    minutes: number;
    seconds?: number;
    completedAt: string;
    taskId?: number | null;
    taskTitle?: string;
    synced?: boolean;
};
export function recordFocus(session: FocusSession, seconds: number, completedAt: string) {
    const history = readLocal<StoredFocus[]>('atlas-focus-history', []);
    if (history.some(s => s.id === session.sessionId) || seconds <= 0)
        return;
    writeLocal('atlas-focus-history', [{ id: session.sessionId, minutes: seconds / 60, seconds, completedAt, taskId: session.taskId, taskTitle: session.taskTitle }, ...history].slice(0, 1000));
    window.dispatchEvent(new Event('atlas-focus-recorded'));
}
let syncing: Promise<void> | null = null;
export function syncFocusRecords() {
    if (syncing)
        return syncing;
    syncing = (async () => {
        for (const record of readLocal<StoredFocus[]>('atlas-focus-history', []).filter(s => !s.synced)) {
            await apiJson('/api/planning', { kind: 'focus', ...record, seconds: record.seconds ?? Math.round(record.minutes * 60) });
            writeLocal('atlas-focus-history', readLocal<StoredFocus[]>('atlas-focus-history', []).map(s => s.id === record.id ? { ...s, synced: true } : s));
        }
    })().finally(() => { syncing = null; });
    return syncing;
}
