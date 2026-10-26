'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiJson, errorMessage } from "../../../shared/api/workspaceClient";
type Subtask = {
    id: string;
    title: string;
    done: number;
    archived: number;
    position: number;
};
type Detail = {
    subtasks: Subtask[];
    focus: Array<{
        id: string;
        seconds: number;
        completedAt: string;
    }>;
};
export function TaskDetails({ taskId }: {
    taskId: number;
}) {
    const [data, setData] = useState<Detail>({ subtasks: [], focus: [] }), [title, setTitle] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [showArchived, setShowArchived] = useState(false);
    const load = useCallback(async () => { setData(await apiJson<Detail>(`/api/planning?taskId=${taskId}`)); }, [taskId]);
    useEffect(() => { const timer = window.setTimeout(() => { void load().catch(e => setError(errorMessage(e))); }, 0); return () => clearTimeout(timer); }, [load]);
    async function save(item?: Subtask) {
        if (busy)
            return;
        setBusy(true);
        setError('');
        try {
            await apiJson('/api/planning', { kind: 'subtask', taskId, ...(item || { title }) });
            if (!item)
                setTitle('');
            await load();
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    }
    const active = data.subtasks.filter(s => !s.archived);
    return <section className="phase2 task-details">
    <div className="p2-heading"><h3>子任务 <small>{active.filter(s => s.done).length}/{active.length}</small></h3><button type="button" onClick={() => setShowArchived(v => !v)}>{showArchived ? '收起已移除' : '已移除'}</button></div>
    {data.subtasks.filter(s => showArchived || !s.archived).map(item => <div className="p2-subtask" key={item.id}>
      <input type="checkbox" aria-label={`完成子任务：${item.title}`} checked={Boolean(item.done)} disabled={busy || Boolean(item.archived)} onChange={() => save({ ...item, done: item.done ? 0 : 1 })}/>
      <input aria-label="子任务名称" maxLength={200} value={item.title} disabled={busy || Boolean(item.archived)} onChange={e => setData(d => ({ ...d, subtasks: d.subtasks.map(s => s.id === item.id ? { ...s, title: e.target.value } : s) }))}/>
      {!item.archived && <button type="button" disabled={busy || !item.title.trim()} onClick={() => save(item)}>保存</button>}
      <button type="button" disabled={busy} onClick={() => save({ ...item, archived: item.archived ? 0 : 1 })}>{item.archived ? '恢复' : '移除'}</button>
    </div>)}
    <div className="p2-inline"><input aria-label="新增子任务" placeholder="新增子任务" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (title.trim())
                    void save();
            }
        }}/><button type="button" disabled={busy || !title.trim()} onClick={() => save()}>添加</button></div>
    {error && <p role="alert">{error}</p>}
    <div className="p2-heading"><h3>专注记录</h3><b>{Math.round(data.focus.reduce((n, s) => n + s.seconds, 0) / 60)} 分钟</b></div>
    {data.focus.slice(0, 8).map(s => <div className="p2-inline" key={s.id}><time>{new Date(s.completedAt).toLocaleString('zh-CN')}</time><span>{Math.round(s.seconds / 60 * 10) / 10} 分钟</span></div>)}
  </section>;
}
