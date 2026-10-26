'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiJson, errorMessage } from "../../../shared/api/workspaceClient";
import { knowledgeKey } from "../domain/identity";
type Material = {
    id: number;
    stableKey?: string;
    title: string;
    source?: string;
};
type Link = {
    id: string;
    knowledgeKey: string;
    title: string;
    source: string;
};
export function ProjectMaterials({ projectId, knowledge, onOpen }: {
    projectId: number;
    knowledge: Material[];
    onOpen: (key: string) => void;
}) {
    const [links, setLinks] = useState<Link[]>([]), [selected, setSelected] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const load = useCallback(async () => setLinks((await apiJson<{
        items: Link[];
    }>(`/api/planning?projectId=${projectId}`)).items), [projectId]);
    useEffect(() => { const timer = window.setTimeout(() => { void load().catch(e => setError(errorMessage(e))); }, 0); return () => clearTimeout(timer); }, [load]);
    async function change(link?: Link) {
        const item = knowledge.find(k => knowledgeKey(k) === selected);
        if (busy || (!link && !item))
            return;
        setBusy(true);
        setError('');
        try {
            await apiJson('/api/planning', { kind: 'project-link', projectId, ...(link ? { remove: true, id: link.id } : { knowledgeKey: selected, title: item!.title, source: item!.source }) });
            setSelected('');
            await load();
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="phase2"><h3>项目资料</h3><div className="p2-list">{links.map(link => <div className="p2-inline" key={link.id}><button type="button" onClick={() => onOpen(link.knowledgeKey)}>{link.title} ↗</button><button type="button" disabled={busy} onClick={() => change(link)}>解除关联</button></div>)}</div><div className="p2-inline"><select aria-label="选择项目资料" value={selected} onChange={e => setSelected(e.target.value)} disabled={busy}><option value="">选择资料</option>{knowledge.filter(k => !links.some(l => l.knowledgeKey === knowledgeKey(k))).map(k => <option value={knowledgeKey(k)} key={knowledgeKey(k)}>{k.title}</option>)}</select><button type="button" disabled={busy || !selected} onClick={() => change()}>关联资料</button></div>{error && <p role="alert">{error}</p>}</section>;
}
