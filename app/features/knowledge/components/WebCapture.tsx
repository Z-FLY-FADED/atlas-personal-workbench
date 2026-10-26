'use client';
import { useEffect, useRef, useState } from 'react';
import { apiJson, errorMessage } from "../../../shared/api/workspaceClient";
import { readLocal, writeLocal } from "../../../shared/hooks/useWorkspaceIO";
import { safeWebUrl } from "../../planning/domain/planning";
type Clip = {
    title: string;
    url: string;
    content: string;
    tags: string;
    projectId: string;
    id: string;
};
const empty: Clip = { title: '', url: '', content: '', tags: '', projectId: '', id: '' };
export function WebCapture({ projects, onSaved, onOpen, onBusyChange }: {
    projects: {
        id: number;
        title: string;
    }[];
    onSaved: () => Promise<unknown>;
    onOpen: (id: number) => void;
    onBusyChange: (busy: boolean) => void;
}) {
    const [clip, setClip] = useState(empty), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(0), [bookmarklet, setBookmarklet] = useState('');
    const anchor = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const key = 'atlas-web-clip-draft';
            let draft = readLocal<Clip>(key, empty);
            try {
                const hash = new URLSearchParams(window.location.hash.slice(1));
                const raw = hash.get('clip');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    draft = { ...empty, title: String(parsed.title || '').slice(0, 200), url: safeWebUrl(String(parsed.url || '')), content: String(parsed.content || '').slice(0, 30000), id: crypto.randomUUID() };
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            }
            catch {
                setError('摘录链接无效，请手动填写');
            }
            draft = { ...draft, id: draft.id || crypto.randomUUID() };
            setClip(draft);
            writeLocal(key, draft);
            setReady(true);
            const base = `${window.location.origin}/?page=${encodeURIComponent('知识库')}&capture=web`;
            const code = `javascript:(()=>{const d={title:document.title,url:location.href,content:String(window.getSelection()).slice(0,30000)};window.open(${JSON.stringify(base)}+'#clip='+encodeURIComponent(JSON.stringify(d)),'_blank','noopener')})()`;
            setBookmarklet(code);
            anchor.current?.setAttribute('href', code);
        }, 0);
        return () => clearTimeout(timer);
    }, []);
    function edit(key: keyof Clip, value: string) { const next = { ...clip, [key]: value, ...(saved ? { id: crypto.randomUUID() } : {}) }; setClip(next); setSaved(0); writeLocal('atlas-web-clip-draft', next); }
    async function save() {
        if (busy || saved)
            return;
        setBusy(true);
        onBusyChange(true);
        setError('');
        try {
            const result = await apiJson<{
                id: number;
            }>('/api/planning', { kind: 'capture', ...clip });
            setSaved(result.id);
            writeLocal('atlas-web-clip-draft', { ...empty, id: crypto.randomUUID() });
            await onSaved();
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
            onBusyChange(false);
        }
    }
    return <div className="phase2 knowledge-web-capture"><form onSubmit={e => { e.preventDefault(); void save(); }}>
    <label>标题<input required maxLength={200} disabled={!ready || busy} value={clip.title} onChange={e => edit('title', e.target.value)}/></label>
    <label>网页地址<input type="url" required maxLength={2048} disabled={!ready || busy} value={clip.url} onChange={e => edit('url', e.target.value)} placeholder="https://"/></label>
    <label>摘录正文<textarea value={clip.content} maxLength={30000} disabled={!ready || busy} onChange={e => edit('content', e.target.value)} rows={6}/></label>
    <label>标签<input value={clip.tags} maxLength={500} disabled={!ready || busy} onChange={e => edit('tags', e.target.value)} placeholder="用逗号分隔"/></label>
    <label>关联项目<select value={clip.projectId} disabled={!ready || busy} onChange={e => edit('projectId', e.target.value)}><option value="">不关联项目</option>{projects.map(p => <option value={p.id} key={p.id}>{p.title}</option>)}</select></label>
    {error && <p role="alert">{error}</p>}<div className="p2-inline"><button className="primary" disabled={!ready || busy || saved > 0}>{busy ? '保存中…' : saved ? '已收录' : '保存到知识库'}</button>{saved > 0 && <button type="button" disabled={busy} onClick={() => onOpen(saved)}>打开已收录资料 →</button>}</div>
  </form><details className="capture-bookmark"><summary>浏览器快捷收录</summary><p>拖到书签栏，选中文字后点击收录。</p><div className="p2-inline"><a className="p2-button" ref={anchor} href="#" draggable onClick={e => e.preventDefault()}>＋ 收录到 ATLAS</a><button type="button" disabled={!ready} onClick={() => navigator.clipboard.writeText(bookmarklet).catch(() => setError('复制失败，请直接拖动按钮到书签栏'))}>复制书签代码</button></div></details></div>;
}
export function WebClipDetail({ item, onClose }: {
    item: {
        title: string;
        content?: string;
        summary: string;
        source: string;
    };
    onClose: () => void;
}) {
    const url = safeWebUrl(item.source);
    return <div className="modal-backdrop detail-backdrop" onMouseDown={onClose}><article className="phase2 p2-card p2-clip-modal" role="dialog" aria-modal="true" aria-label={item.title} onMouseDown={e => e.stopPropagation()}><div className="p2-heading"><h2>{item.title}</h2><button onClick={onClose} aria-label="关闭摘录">×</button></div>{url && <a href={url} target="_blank" rel="noreferrer">查看原网页 ↗</a>}<p className="p2-clip-text">{item.content || item.summary || '未保存摘录正文'}</p></article></div>;
}
