"use client";
import { useState } from 'react';
import type { WorkspaceProjectRecord, WorkspaceQuickNote } from "../../../contracts/workspace";
import { clearFormDraft } from "../../../shared/hooks/useWorkspaceIO";
import { ProjectMaterials } from "../../knowledge/components/ProjectMaterials";
import { formatProjectDueDate, projectDueDateInputValue } from "../domain/projectDates";
import { dayOffset, formatStoredDate, projectTimeline } from "../domain/workspace";
export type { WorkspaceProjectRecord, WorkspaceQuickNote } from "../../../contracts/workspace";
type LinkedTask = {
    id: number;
    title: string;
    done: boolean;
    projectId?: number | null;
};
export function WorkspaceProjectsPage({ projects, today, onNew, onEdit }: {
    projects: WorkspaceProjectRecord[];
    today: string;
    onNew: () => void;
    onEdit: (project: WorkspaceProjectRecord) => void;
}) {
    const [filter, setFilter] = useState<'全部' | WorkspaceProjectRecord['status']>('全部');
    const visible = projects.filter(project => filter === '全部' || project.status === filter);
    const days = Array.from({ length: 14 }, (_, i) => { const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + i); return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: '日一二三四五六'[date.getUTCDay()] }; });
    return <section className="workspace-collection-page">
    <div className="workspace-collection-title"><div><p>PROJECTS</p><h1>项目</h1></div><button onClick={onNew}>＋ 新建项目</button></div>
    <div className="workspace-collection-tabs">{(['全部', '进行中', '已暂停', '已完成'] as const).map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<span>{item === '全部' ? projects.length : projects.filter(p => p.status === item).length}</span></button>)}</div>
    <div className="workspace-project-board">{visible.map(project => <button key={project.id} onClick={() => onEdit(project)} style={{ '--project-accent': project.accent } as React.CSSProperties}>
      <span className="workspace-project-board-accent"/><div><em>{project.status} · {project.stage}</em><small>{formatProjectDueDate(project.dueDate)}</small></div><h2>{project.title}</h2><p>下一里程碑：{project.nextMilestone}{project.milestoneDate ? ` · ${formatProjectDueDate(project.milestoneDate)}` : ''}</p><div className="workspace-project-board-progress"><i style={{ width: `${project.progress}%` }}/></div><footer><b>{project.progress}%{project.progressMode === 'auto' ? ' · 自动' : ''}</b><span>{project.remainingTasks} 项待办</span><i>任务与详情 →</i></footer>
    </button>)}</div>
    {!visible.length && <div className="workspace-page-empty"><h2>暂无{filter === '全部' ? '' : filter}项目</h2><button onClick={onNew}>＋ 新建项目</button></div>}
    <section className="workspace-gantt"><header><div><p>CALENDAR GANTT</p><h2>项目时间轴</h2><span>未来 14 天</span></div></header>
      <div className="workspace-gantt-scroll"><div className="workspace-gantt-chart"><div className="workspace-gantt-corner">项目 / 日期</div><div className="workspace-gantt-days">{days.map((date, i) => <span key={date.key} className={i === 0 ? 'today' : ''}><small>{date.weekday}</small><b>{date.day}</b></span>)}</div>
        {visible.map(project => {
            const position = projectTimeline(project, today);
            const marker = project.milestoneDate ? dayOffset(project.milestoneDate, today) : -1;
            return <div className="workspace-gantt-row" key={project.id}><button className="workspace-gantt-label" onClick={() => onEdit(project)}><b>{project.title}</b><small>{project.startDate ? `${project.startDate} → ` : ''}{formatProjectDueDate(project.dueDate)}</small></button><div className="workspace-gantt-track">
          {position.state === 'scheduled' ? <button className={`workspace-gantt-bar ${project.status === '已完成' ? 'done' : project.status === '已暂停' ? 'paused' : 'active'}`} style={{ '--gantt-start': position.start, '--gantt-span': position.span, '--gantt-progress': `${project.progress}%`, '--project-accent': project.accent } as React.CSSProperties} onClick={() => onEdit(project)}><i /><span>{project.nextMilestone}</span><b>{project.progress}%</b></button> : <button className={`gantt-status ${position.state}`} onClick={() => onEdit(project)}>{position.state === 'overdue' ? (project.status === '已完成' ? '已结束' : '已逾期 · 更新计划') : position.state === 'future' ? '将在 14 天之后开始' : position.state === 'invalid' ? '日期顺序需修正' : '未排期 · 补充开始和截止日期'}</button>}
          {marker >= 0 && marker < 14 && <span className="gantt-milestone" style={{ left: `${(marker + .5) / 14 * 100}%` }} title={`${project.milestoneDate} · ${project.nextMilestone}`}>◆</span>}
        </div></div>;
        })}
      </div></div>
    </section>
  </section>;
}
export function WorkspaceNotesPage({ notes, onNew, onUpdate, onEdit, onConvert }: {
    notes: WorkspaceQuickNote[];
    onNew: () => void;
    onUpdate: (note: WorkspaceQuickNote, status: WorkspaceQuickNote['status']) => Promise<boolean>;
    onEdit: (note: WorkspaceQuickNote) => void;
    onConvert: (note: WorkspaceQuickNote, target: 'task' | 'knowledge') => void;
}) {
    const [filter, setFilter] = useState<'全部' | WorkspaceQuickNote['status']>('全部');
    const [busy, setBusy] = useState<number | null>(null);
    const visible = notes.filter(note => filter === '全部' || note.status === filter);
    async function update(note: WorkspaceQuickNote, status: WorkspaceQuickNote['status']) {
        setBusy(note.id);
        try {
            await onUpdate(note, status);
        }
        finally {
            setBusy(null);
        }
    }
    return <section className="workspace-collection-page"><div className="workspace-collection-title"><div><p>QUICK NOTES</p><h1>笔记</h1></div><button onClick={onNew}>＋ 写笔记</button></div>
    <div className="workspace-collection-tabs">{(['全部', '待整理', '已整理', '已归档'] as const).map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<span>{item === '全部' ? notes.length : notes.filter(note => note.status === item).length}</span></button>)}</div>
    <div className="workspace-note-grid">{visible.map(note => <article key={note.id}><header><span>{note.status}</span><time>{formatStoredDate(note.updatedAt || note.createdAt)}</time></header><p>{note.content}</p><footer><button onClick={() => onEdit(note)}>编辑</button><button onClick={() => onConvert(note, 'task')}>转为任务</button><button onClick={() => onConvert(note, 'knowledge')}>存入资料库</button>{note.status === '待整理' && <button disabled={busy === note.id} onClick={() => update(note, '已整理')}>标为已整理</button>}<button disabled={busy === note.id} onClick={() => update(note, note.status === '已归档' ? '待整理' : '已归档')}>{note.status === '已归档' ? '恢复到速记箱' : '归档'}</button></footer></article>)}</div>
    {!visible.length && <div className="workspace-page-empty"><h2>暂无{filter === '全部' ? '' : filter}笔记</h2><button onClick={onNew}>＋ 写笔记</button></div>}
  </section>;
}
export const WORKSPACE_TOOL_GROUPS: ReadonlyArray<{
    title: string;
    items: ReadonlyArray<readonly [
        string,
        string,
        string
    ]>;
}> = [
    { title: '职业', items: [['简历投递', '招聘与投递', '跟踪岗位机会与面试流程']] },
    { title: '投资研究', items: [['股票', '股票研究', 'A股、港股与美股统一筛选和跟踪'], ['行业速览', '行业速览', '行业资讯与来源管理']] },
    { title: '智能', items: [['AI 模型', 'AI 模型', '连接模型、运行查询和自动任务']] },
];
type EntryProps = {
    knowledge: {
        id: number;
        title: string;
        stableKey?: string;
        source?: string;
    }[];
    onOpenKnowledge: (key: string) => void;
    projectOpen: boolean;
    noteOpen: boolean;
    project: WorkspaceProjectRecord | null;
    note: WorkspaceQuickNote | null;
    tasks: LinkedTask[];
    onClose: () => void;
    onEditTask: (id: number) => void;
    onSaveProject: (values: Omit<WorkspaceProjectRecord, 'id'>) => Promise<boolean>;
    onSaveNote: (content: string) => Promise<boolean>;
};
export function WorkspaceEntryModals(props: EntryProps) {
    const [saving, setSaving] = useState(false);
    if (!props.projectOpen && !props.noteOpen)
        return null;
    const { project, note } = props;
    return <div className="workspace-entry-layer"><button className="workspace-entry-scrim" disabled={saving} onClick={props.onClose} aria-label="关闭"/>
    {props.projectOpen && <form className="workspace-entry-modal workspace-project-modal" data-draft-key={`atlas-project-draft-${project?.id || 'new'}`} onSubmit={async (event) => {
                event.preventDefault();
                if (saving)
                    return;
                const form = event.currentTarget;
                const data = new FormData(form);
                const startDate = String(data.get('startDate') || '');
                const dueDate = String(data.get('dueDate') || '');
                const endInput = form.elements.namedItem('dueDate') as HTMLInputElement;
                endInput.setCustomValidity(startDate && dueDate && startDate > dueDate ? '截止日期不能早于开始日期' : '');
                if (!form.reportValidity())
                    return;
                setSaving(true);
                try {
                    if (await props.onSaveProject({ title: String(data.get('title')).trim(), stage: String(data.get('stage') || '规划中'), status: String(data.get('status')) as WorkspaceProjectRecord['status'], progress: Number(data.get('progress') || 0), remainingTasks: project?.remainingTasks || 0, nextMilestone: String(data.get('nextMilestone') || '确定下一里程碑'), dueDate: dueDate || '待安排', startDate, milestoneDate: String(data.get('milestoneDate') || ''), progressMode: String(data.get('progressMode')) as 'manual' | 'auto', accent: String(data.get('accent') || '#a97d30') }))
                        clearFormDraft(form);
                }
                finally {
                    setSaving(false);
                }
            }}><header><div><p>PROJECT</p><h2>{project ? '项目详情与编辑' : '新建项目'}</h2></div><button type="button" disabled={saving} onClick={props.onClose} aria-label="关闭项目窗口">×</button></header>
      <label>项目名称<input name="title" required maxLength={80} defaultValue={project?.title} autoFocus/></label>
      <div className="workspace-entry-row"><label>当前阶段<input name="stage" defaultValue={project?.stage || '规划中'}/></label><label>状态<select name="status" defaultValue={project?.status || '进行中'}><option>进行中</option><option>已暂停</option><option>已完成</option></select></label></div>
      <div className="workspace-entry-row"><label>开始日期<input name="startDate" type="date" defaultValue={projectDueDateInputValue(project?.startDate)} onInput={event => (event.currentTarget.form?.elements.namedItem("dueDate") as HTMLInputElement)?.setCustomValidity("")}/></label><label>截止日期<input name="dueDate" type="date" defaultValue={projectDueDateInputValue(project?.dueDate)} onInput={event => event.currentTarget.setCustomValidity('')}/></label></div>
      <div className="workspace-entry-row"><label>下一里程碑<input name="nextMilestone" defaultValue={project?.nextMilestone}/></label><label>里程碑日期<input name="milestoneDate" type="date" defaultValue={projectDueDateInputValue(project?.milestoneDate)}/></label></div>
      <div className="workspace-entry-row"><label>进度方式<select name="progressMode" defaultValue={project?.progressMode || 'manual'}><option value="manual">手动设置</option><option value="auto">按关联任务自动计算</option></select></label><label>手动进度（%）<input name="progress" type="number" min="0" max="100" defaultValue={project?.progress || 0}/></label></div>
      <label>识别色<input name="accent" type="color" defaultValue={project?.accent || '#a97d30'}/></label>
      {project && <section className="project-linked-tasks"><h3>关联任务</h3>{props.tasks.filter(task => task.projectId === project.id).map(task => <button type="button" key={task.id} onClick={() => props.onEditTask(task.id)}>{task.done ? '✓' : '○'} {task.title}<span>编辑 →</span></button>)}{!props.tasks.some(task => task.projectId === project.id) && <p>暂无关联任务</p>}</section>}
      {project && <ProjectMaterials key={project.id} projectId={project.id} knowledge={props.knowledge} onOpen={props.onOpenKnowledge}/>}
      <footer><button type="button" disabled={saving} onClick={props.onClose}>取消</button><button disabled={saving} type="submit">{saving ? '保存中…' : '保存项目'}</button></footer>
    </form>}
    {props.noteOpen && <form className="workspace-entry-modal workspace-note-modal" data-draft-key={`atlas-note-draft-${note?.id || 'new'}`} onSubmit={async (event) => {
                event.preventDefault();
                if (saving)
                    return;
                const form = event.currentTarget;
                const data = new FormData(form);
                setSaving(true);
                try {
                    if (await props.onSaveNote(String(data.get('content') || '')))
                        clearFormDraft(form);
                }
                finally {
                    setSaving(false);
                }
            }}><header><h2>{note ? '编辑笔记' : '写一条笔记'}</h2><button type="button" disabled={saving} onClick={props.onClose} aria-label="关闭笔记窗口">×</button></header><label>内容<textarea name="content" autoFocus required maxLength={6000} defaultValue={note?.content}/></label><footer><button type="button" disabled={saving} onClick={props.onClose}>取消</button><button type="submit" disabled={saving}>{saving ? '保存中…' : '保存笔记'}</button></footer></form>}
  </div>;
}
