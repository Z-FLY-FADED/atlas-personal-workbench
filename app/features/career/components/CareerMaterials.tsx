'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiJson, errorMessage } from "../../../shared/api/workspaceClient";
import { readLocal, writeLocal } from "../../../shared/hooks/useWorkspaceIO";
import { ATTACHMENT_MAX_BYTES } from "../domain/materials";
type VersionInfo = {
    id: string;
    title: string;
    company: string;
    role: string;
    revision: number;
    archived: number;
    updatedAt: string;
};
type Version = VersionInfo & {
    content: string;
    sourceContent: string;
    changeNote: string;
};
type Attachment = {
    id: string;
    fileName: string;
    size: number;
    archived: number;
};
type Link = {
    applicationId: number;
    versionId: string;
    versionRevision: number;
    title: string;
    linkedAt: string;
};
type Application = {
    id: number;
    company: string;
    role: string;
};
const api = '/api/career-materials';
export function CareerMaterials({ hasResume, applications }: {
    hasResume: boolean;
    applications: Application[];
}) {
    const [versions, setVersions] = useState<VersionInfo[]>([]), [links, setLinks] = useState<Link[]>([]), [selected, setSelected] = useState<Version | null>(null), [attachments, setAttachments] = useState<Attachment[]>([]);
    const [error, setError] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [showArchived, setShowArchived] = useState(false), [applicationId, setApplicationId] = useState('');
    const createId = useRef(''), loadCounter = useRef(0);
    const loadList = useCallback(async () => {
        const result = await apiJson<{
            versions: VersionInfo[];
            links: Link[];
        }>(api);
        setVersions(result.versions);
        setLinks(result.links);
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => { void loadList().catch(e => setError(errorMessage(e))); }, 0); return () => clearTimeout(timer); }, [loadList]);
    async function open(id: string) {
        const sequence = ++loadCounter.current;
        setError('');
        try {
            const result = await apiJson<{
                item: Version;
                attachments: Attachment[];
            }>(`${api}?id=${encodeURIComponent(id)}`);
            if (sequence !== loadCounter.current)
                return;
            const local = readLocal<Version | null>(`atlas-resume-version-draft-${id}`, null);
            setSelected(local || result.item);
            setAttachments(result.attachments);
            setDirty(Boolean(local));
            if (local && local.revision !== result.item.revision)
                setError('本机草稿与最新版本不同，请先复制正文，再重新载入');
        }
        catch (e) {
            setError(errorMessage(e));
        }
    }
    function edit(key: 'title' | 'company' | 'role' | 'content' | 'changeNote', value: string) {
        if (!selected)
            return;
        const next = { ...selected, [key]: value };
        setSelected(next);
        setDirty(true);
        writeLocal(`atlas-resume-version-draft-${next.id}`, next);
    }
    async function mutate(payload: unknown, reloadId = selected?.id) {
        if (busy)
            return false;
        setBusy(true);
        setError('');
        try {
            await apiJson(api, payload);
            await loadList();
            if (reloadId)
                await open(reloadId);
            return true;
        }
        catch (e) {
            setError(errorMessage(e));
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    async function save() {
        if (!selected || busy)
            return;
        setBusy(true);
        setError('');
        try {
            await apiJson(api, { kind: 'save', ...selected });
            window.localStorage.removeItem(`atlas-resume-version-draft-${selected.id}`);
            setDirty(false);
            await loadList();
            await open(selected.id);
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    }
    async function upload(file: File) {
        if (!selected || busy)
            return;
        if (file.size > ATTACHMENT_MAX_BYTES) {
            setError('单个附件不能超过 1 MB');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('读取附件失败')); reader.readAsDataURL(file); });
            await apiJson(api, { kind: 'upload', id: crypto.randomUUID(), versionId: selected.id, fileName: file.name, data });
            await open(selected.id);
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="phase2 p2-wide"><div className="p2-grid">
    <section className="p2-card"><div className="p2-heading"><h2>岗位简历版本</h2><button onClick={() => setShowArchived(v => !v)}>{showArchived ? '隐藏归档' : '显示归档'}</button></div>
      <form onSubmit={async (e) => {
            e.preventDefault();
            if (busy)
                return;
            const form = e.currentTarget, data = new FormData(form);
            createId.current ||= crypto.randomUUID();
            if (await mutate({ kind: 'create', id: createId.current, title: data.get('title'), company: data.get('company'), role: data.get('role'), sourceId: data.get('sourceId') }, createId.current)) {
                form.reset();
                createId.current = '';
            }
        }}>
        <label>版本名称<input name="title" required maxLength={200} placeholder="例如：机器人控制工程师"/></label>
        <div className="p2-grid"><label>目标公司<input name="company" maxLength={200}/></label><label>目标岗位<input name="role" maxLength={200}/></label></div>
        <label>复制来源<select name="sourceId"><option value="">主简历</option>{versions.filter(v => !v.archived).map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label>
        <button className="primary" disabled={busy || (!hasResume && !versions.length)}>创建版本</button>
      </form>
      <div className="p2-list">{versions.filter(v => showArchived || !v.archived).map(v => <article key={v.id} className={selected?.id === v.id ? 'p2-version-selected' : ''}><div className="p2-heading"><b>{v.title}</b><button disabled={busy} onClick={() => open(v.id)}>打开</button></div><small>{[v.company, v.role].filter(Boolean).join(' · ')} · 修订 {v.revision}{v.archived ? ' · 已归档' : ''}</small></article>)}</div>
    </section>
    <section className="p2-card">{selected ? <>
      <div className="p2-heading"><h2>编辑版本</h2><small>{dirty ? '本机草稿' : `修订 ${selected.revision}`}</small></div>
      <label>版本名称<input value={selected.title} maxLength={200} disabled={busy || Boolean(selected.archived)} onChange={e => edit('title', e.target.value)}/></label>
      <div className="p2-grid"><label>目标公司<input value={selected.company} maxLength={200} disabled={busy || Boolean(selected.archived)} onChange={e => edit('company', e.target.value)}/></label><label>目标岗位<input value={selected.role} maxLength={200} disabled={busy || Boolean(selected.archived)} onChange={e => edit('role', e.target.value)}/></label></div>
      <label>简历正文<textarea className="p2-resume-editor" value={selected.content} maxLength={100000} disabled={busy || Boolean(selected.archived)} onChange={e => edit('content', e.target.value)}/></label>
      <label>本次修改<input value={selected.changeNote} maxLength={2000} disabled={busy || Boolean(selected.archived)} onChange={e => edit('changeNote', e.target.value)} placeholder="记录调整的内容"/></label>
      <div className="p2-inline"><button className="primary" disabled={busy || !dirty || Boolean(selected.archived)} onClick={save}>保存版本</button><button disabled={busy} onClick={() => navigator.clipboard.writeText(selected.content).catch(() => setError('复制失败，请在正文输入框全选复制'))}>复制正文</button>{!dirty && <><a className="p2-button" href={`${api}?kind=export&id=${encodeURIComponent(selected.id)}`} download>导出 JSON</a><a className="p2-button" href={`${api}?kind=print&id=${encodeURIComponent(selected.id)}`} target="_blank" rel="noreferrer">打印 / PDF</a></>}</div>
      <details><summary>查看复制时的原文</summary><pre className="p2-source">{selected.sourceContent}</pre></details>
      <div className="p2-inline"><button disabled={busy || dirty} onClick={() => mutate({ kind: 'archive', id: selected.id, revision: selected.revision, archived: !selected.archived })}>{selected.archived ? '恢复版本' : '归档版本'}</button>{dirty && <button disabled={busy} onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(selected.content);
                        window.localStorage.removeItem(`atlas-resume-version-draft-${selected.id}`);
                        await open(selected.id);
                    }
                    catch {
                        setError('无法复制正文，草稿继续保留');
                    }
                }}>复制草稿并载入最新版本</button>}</div>
      <div className="p2-heading"><h3>关联投递</h3></div><div className="p2-inline"><select aria-label="选择投递记录" value={applicationId} onChange={e => setApplicationId(e.target.value)} disabled={busy || dirty}><option value="">选择投递记录</option>{applications.map(a => <option key={a.id} value={a.id}>{a.company} · {a.role}</option>)}</select><button disabled={busy || dirty || !applicationId || Boolean(selected.archived)} onClick={() => mutate({ kind: 'bind', versionId: selected.id, revision: selected.revision, applicationId: Number(applicationId) })}>{links.some(l => l.applicationId === Number(applicationId)) ? '更新投递快照' : '保存投递快照'}</button></div>
      <div className="p2-heading"><h3>附件</h3><small>单个 ≤ 1 MB</small></div><label>添加附件<input type="file" aria-label="上传求职附件" accept=".pdf,.docx,.png,.jpg,.jpeg,.txt" disabled={busy || dirty || Boolean(selected.archived)} onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                    void upload(file);
            }}/></label>
      <div className="p2-list">{attachments.filter(a => showArchived || !a.archived).map(a => <article key={a.id}><b>{a.fileName}</b><div className="p2-inline"><small>{Math.ceil(a.size / 1024)} KB{a.archived ? ' · 已归档' : ''}</small><a className="p2-button" href={`${api}?kind=attachment&id=${encodeURIComponent(a.id)}`} download>下载</a><button disabled={busy || dirty} onClick={() => mutate({ kind: 'attachment-archive', id: a.id, archived: !a.archived })}>{a.archived ? '恢复附件' : '归档附件'}</button></div></article>)}</div>
    </> : <div><h2>选择或创建版本</h2></div>}</section>
    {error && <p className="p2-wide" role="alert">{error}</p>}
    {links.length > 0 && <section className="p2-card p2-wide"><h2>投递快照</h2><div className="p2-list">{links.map(link => { const a = applications.find(item => item.id === link.applicationId); return <article key={link.applicationId}><div className="p2-heading"><b>{a ? `${a.company} · ${a.role}` : '原投递记录'} · {link.title}</b><a className="p2-button" href={`${api}?kind=print&applicationId=${link.applicationId}`} target="_blank" rel="noreferrer">查看 / 打印快照</a></div><small>修订 {link.versionRevision} · {new Date(link.linkedAt).toLocaleString('zh-CN')}</small></article>; })}</div></section>}
  </div></section>;
}
