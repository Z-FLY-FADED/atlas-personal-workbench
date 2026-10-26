"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { readLocal, writeLocal } from "../../../shared/hooks/useWorkspaceIO";
import { shanghaiDateKey } from "../../tasks/domain/dates";
import { recordFocus, syncFocusRecords } from "../domain/focus";
import { EMPTY_FOCUS, focusSeconds, type FocusSession } from "../domain/workspace";
import type { WorkspaceProject, WorkspaceReminder, WorkspaceTask } from './WorkspaceOverview';
const FOCUS_KEY = 'atlas-focus-v1';
export function useFocusTimer(onNotify: (message: string) => void, tasks: WorkspaceTask[] = []) {
    const [session, setSession] = useState<FocusSession>(EMPTY_FOCUS);
    const [seconds, setSeconds] = useState(EMPTY_FOCUS.remaining);
    const notify = useRef(onNotify);
    const [syncError, setSyncError] = useState(false);
    useEffect(() => { notify.current = onNotify; });
    useEffect(() => {
        const sync = () => { void syncFocusRecords().then(() => setSyncError(false)).catch(() => setSyncError(true)); };
        sync();
        const interval = window.setInterval(sync, 60000);
        window.addEventListener('atlas-focus-recorded', sync);
        window.addEventListener('online', sync);
        return () => { clearInterval(interval); window.removeEventListener('atlas-focus-recorded', sync); window.removeEventListener('online', sync); };
    }, []);
    useEffect(() => {
        const tick = () => {
            let current = readLocal(FOCUS_KEY, EMPTY_FOCUS);
            const remaining = focusSeconds(current, Date.now());
            if (current.endsAt !== null && remaining === 0) {
                const history = readLocal<Array<{
                    id: string;
                    minutes: number;
                    completedAt: string;
                }>>('atlas-focus-history', []);
                if (!history.some(item => item.id === current.sessionId)) {
                    recordFocus(current, current.duration * 60, new Date(current.endsAt).toISOString());
                    notify.current(`已完成 ${current.duration} 分钟专注，休息一下吧`);
                }
                current = { ...current, endsAt: null, remaining: 0, completed: history.length + (history.some(item => item.id === current.sessionId) ? 0 : 1) };
                writeLocal(FOCUS_KEY, current);
            }
            setSession(previous => JSON.stringify(previous) === JSON.stringify(current) ? previous : current);
            setSeconds(remaining);
        };
        const initial = window.setTimeout(tick, 0);
        const interval = window.setInterval(tick, 1000);
        return () => { window.clearTimeout(initial); window.clearInterval(interval); };
    }, []);
    const update = useCallback((current: FocusSession) => { writeLocal(FOCUS_KEY, current); setSession(current); setSeconds(focusSeconds(current, Date.now())); }, []);
    const toggle = useCallback(() => {
        const current = readLocal(FOCUS_KEY, EMPTY_FOCUS);
        const remaining = focusSeconds(current, Date.now());
        update(current.endsAt !== null ? { ...current, endsAt: null, remaining } : { ...current, remaining: remaining || current.duration * 60, endsAt: Date.now() + (remaining || current.duration * 60) * 1000, sessionId: remaining && current.sessionId ? current.sessionId : crypto.randomUUID() });
    }, [update]);
    const inProgress = Boolean(session.sessionId && seconds > 0 && seconds < session.duration * 60) || session.endsAt !== null;
    function finish() {
        const current = readLocal(FOCUS_KEY, EMPTY_FOCUS), elapsed = current.duration * 60 - focusSeconds(current, Date.now());
        if (elapsed < 1 || !current.sessionId)
            return;
        recordFocus(current, elapsed, new Date().toISOString());
        update({ ...current, remaining: 0, endsAt: null, completed: current.completed + 1 });
    }
    return <section className="workspace-rail-card workspace-focus">
    <p><b>专注计时</b><span className={session.endsAt ? 'active' : ''}>{session.endsAt ? '专注中' : seconds === 0 ? '已完成' : inProgress ? '已暂停' : '待开始'}</span></p>
    <select aria-label="关联专注任务" value={session.taskId || ''} disabled={inProgress} onChange={e => { const task = tasks.find(t => t.id === Number(e.target.value)); update({ ...session, taskId: task?.id || null, taskTitle: task?.title || '' }); }}>
      <option value="">自由专注</option>{tasks.filter(t => !t.done || t.id === session.taskId).map(t => <option key={t.id} value={t.id}>{t.title}{t.activeOn ? ` · ${t.activeOn}` : ''}{t.done ? ' · 已完成' : ''}</option>)}{session.taskId && !tasks.some(t => t.id === session.taskId) && <option value={session.taskId}>{session.taskTitle || '原关联任务'}</option>}
    </select>
    <h3 aria-live="off" aria-label="剩余专注时间">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</h3>
    <div>{[25, 50].map(duration => <button key={duration} disabled={inProgress} className={session.duration === duration ? 'active' : ''} onClick={() => update({ ...session, duration, remaining: duration * 60, sessionId: '', endsAt: null })}>{duration} 分钟</button>)}</div>
    <button className="workspace-focus-start" onClick={toggle}>{session.endsAt ? '暂停专注' : seconds === 0 ? '再来一次' : seconds < session.duration * 60 ? '继续专注' : '开始专注'}</button>
    {inProgress && <button type="button" onClick={finish}>结束并记录</button>}
    {syncError && <small role="status">记录已保存在本机，连接恢复后自动重试</small>}
  </section>;
}
export function WorkspaceCalendar({ today, tasks, projects, reminders, onReminders }: {
    today: string;
    tasks: WorkspaceTask[];
    projects: WorkspaceProject[];
    reminders: WorkspaceReminder[];
    onReminders: (day?: string) => void;
}) {
    const [monthOffset, setMonthOffset] = useState(0);
    const [selected, setSelected] = useState(today);
    const date = new Date(`${today}T12:00:00`);
    const month = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1, 12);
    const dayKey = (day: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = [...projects.map(item => ({ date: item.dueDate, title: `项目 · ${item.title}` })), ...reminders.filter(item => !item.done).map(item => ({ date: item.remindAt.slice(0, 10), title: item.title })), ...tasks.filter(task => !task.done).map(task => ({ date: task.activeOn || /^\d{4}-\d{2}-\d{2}/.exec(task.date)?.[0] || (task.horizon === '今日' ? today : ''), title: `任务 · ${task.title}` }))];
    const cells = [...Array(month.getDay()).fill(0), ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => i + 1)];
    return <section className="workspace-rail-card workspace-calendar">
    <header><button aria-label="上个月" onClick={() => setMonthOffset(value => value - 1)}>‹</button><b>{month.getFullYear()} 年 {month.getMonth() + 1} 月</b><button aria-label="下个月" onClick={() => setMonthOffset(value => value + 1)}>›</button></header>
    <p>{['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}</p>
    <div className="calendar-days">{cells.map((day, i) => day ? <button key={day} aria-label={dayKey(day)} aria-pressed={selected === dayKey(day)} className={`${dayKey(day) === today ? 'today' : ''} ${events.some(item => item.date === dayKey(day)) ? 'has-events' : ''}`} onClick={() => setSelected(dayKey(day))}>{day}</button> : <span key={`blank-${i}`}/>)}</div>
    <section className="calendar-agenda"><b>{selected} 的安排</b>{events.filter(item => item.date === selected).map((item, index) => <p key={`${item.title}-${index}`}>{item.title}</p>)}{!events.some(item => item.date === selected) && <p>暂无安排</p>}<button onClick={() => onReminders(selected)}>＋ 为这一天添加提醒</button></section>
  </section>;
}
export function WorkspaceReminders({ items, day, onClose, onSave, onToggle }: {
    items: WorkspaceReminder[];
    day: string;
    onClose: () => void;
    onSave: (title: string, remindAt: string) => Promise<boolean>;
    onToggle: (item: WorkspaceReminder) => Promise<boolean>;
}) {
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    return <div className="workspace-reminder-layer"><button className="workspace-entry-scrim" aria-label="关闭提醒" onClick={onClose}/><section className="workspace-entry-modal" role="dialog" aria-modal="true" aria-label="提醒中心">
    <header><div><p>REMINDERS</p><h2>提醒中心</h2></div><button onClick={onClose} aria-label="关闭提醒窗口">×</button></header>
    
    <form onSubmit={async (event) => {
            event.preventDefault();
            if (saving)
                return;
            const form = event.currentTarget;
            const data = new FormData(form);
            setSaving(true);
            try {
                if (await onSave(String(data.get('title')), String(data.get('remindAt'))))
                    form.reset();
            }
            finally {
                setSaving(false);
            }
        }}>
      <label>提醒事项<input name="title" required maxLength={100} placeholder="例如：准备周复盘"/></label>
      <label>提醒时间<input name="remindAt" type="datetime-local" required defaultValue={`${day || shanghaiDateKey()}T09:00`}/></label>
      <button className="primary" disabled={saving}>{saving ? '保存中…' : '添加提醒'}</button>
    </form>
    <div className="reminder-list">{[...items].sort((a, b) => Number(a.done) - Number(b.done) || a.remindAt.localeCompare(b.remindAt)).map(item => <article key={item.id} className={item.done ? 'done' : ''}><div><b>{item.title}</b><small>{item.remindAt.replace('T', ' ')}</small></div><button disabled={busyId === item.id} onClick={async () => {
                setBusyId(item.id);
                try {
                    await onToggle(item);
                }
                finally {
                    setBusyId(null);
                }
            }}>{item.done ? '恢复提醒' : '标为完成'}</button></article>)}{!items.length && <p>还没有提醒，添加一项安排吧。</p>}</div>
  </section></div>;
}
