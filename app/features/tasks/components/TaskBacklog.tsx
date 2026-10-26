"use client";
import { useState } from 'react';
import { checkedFetch } from "../../../shared/hooks/useWorkspaceIO";
type Task = {
    id: number;
    title: string;
    horizon: string;
    activeOn?: string;
    done: boolean;
};
export function TaskBacklog({ tasks, today, onChanged, onEdit }: {
    tasks: Task[];
    today: string;
    onChanged: () => Promise<unknown>;
    onEdit?: (id: number) => void;
}) {
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [dates, setDates] = useState<Record<number, string>>({});
    const backlog = tasks.filter(task => task.horizon === '今日' && !task.done && task.activeOn && task.activeOn < today);
    const future = tasks.filter(task => task.horizon === '今日' && !task.done && task.activeOn && task.activeOn > today);
    async function act(body: Record<string, unknown>) {
        setBusy(true);
        setError('');
        try {
            await checkedFetch('/api/task-actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            await onChanged();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : '操作失败');
        }
        finally {
            setBusy(false);
        }
    }
    async function archive(id: number) {
        setBusy(true);
        setError('');
        try {
            await checkedFetch(`/api/workspace?type=task&id=${id}`, { method: 'DELETE' });
            await onChanged();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : '归档失败');
        }
        finally {
            setBusy(false);
        }
    }
    if (!backlog.length && !future.length && !error)
        return null;
    return <section className="panel round2-panel task-backlog">{backlog.length > 0 && <div className="p2-heading"><div><h3>往日未完成 <span>{backlog.length}</span></h3></div></div>}
    {error && <p role="alert">{error}</p>}
    {backlog.map(task => <article key={task.id}><div><b>{task.title}</b><small>原安排：{task.activeOn}</small></div><div className="round2-actions"><button disabled={busy} onClick={() => act({ action: 'reschedule', id: task.id, date: today })}>移到今天</button><input type="date" aria-label={`重新安排${task.title}`} value={dates[task.id] || today} onChange={event => setDates({ ...dates, [task.id]: event.target.value })}/><button disabled={busy || !dates[task.id]} onClick={() => act({ action: 'reschedule', id: task.id, date: dates[task.id] })}>改期</button><button disabled={busy} onClick={() => archive(task.id)}>移入回收站</button></div></article>)}
    {future.length > 0 && <details><summary>未来已安排 · {future.length} 项</summary>{[...future].sort((a, b) => (a.activeOn || '').localeCompare(b.activeOn || '')).map(task => <article key={task.id}><b>{task.activeOn} · {task.title}</b><div className="round2-actions">{onEdit && <button disabled={busy} onClick={() => onEdit(task.id)}>编辑任务</button>}<button disabled={busy} onClick={() => act({ action: 'reschedule', id: task.id, date: today })}>提前到今天</button><button disabled={busy} onClick={() => archive(task.id)}>移入回收站</button></div></article>)}</details>}
  </section>;
}
