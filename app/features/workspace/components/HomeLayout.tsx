'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiJson, errorMessage } from "../../../shared/api/workspaceClient";
import { DEFAULT_LAYOUT, HOME_WIDGETS, normalizeLayout, type HomeLayout, type WidgetKey } from "../../planning/domain/planning";
export function useHomeLayout() {
    const [layout, setLayout] = useState<HomeLayout>(DEFAULT_LAYOUT), [draft, setDraft] = useState<HomeLayout>(DEFAULT_LAYOUT);
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError('');
        try {
            const data = await apiJson<{
                layout: HomeLayout;
            }>('/api/planning?kind=layout', undefined, { signal });
            if (!signal?.aborted) {
                setLayout(normalizeLayout(data.layout));
                setReady(true);
            }
        }
        catch (error) {
            if (!signal?.aborted)
                setError(errorMessage(error));
        }
        finally {
            if (!signal?.aborted)
                setLoading(false);
        }
    }, []);
    useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void load(controller.signal), 0); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
    function move(group: 'main' | 'side', key: WidgetKey, delta: number) {
        const items = [...draft[group]], from = items.indexOf(key), to = from + delta;
        if (to < 0 || to >= items.length)
            return;
        [items[from], items[to]] = [items[to], items[from]];
        setDraft({ ...draft, [group]: items });
    }
    async function save() {
        setBusy(true);
        setError('');
        try {
            const result = await apiJson<{
                layout: HomeLayout;
            }>('/api/planning', { kind: 'layout', layout: draft });
            setLayout(result.layout);
            setOpen(false);
        }
        catch (e) {
            setError(errorMessage(e));
        }
        finally {
            setBusy(false);
        }
    }
    const slot = (key: WidgetKey) => ({ hidden: layout.hidden.includes(key), style: { order: [...layout.main, ...layout.side].indexOf(key) }, 'data-home-widget': key });
    const controls = <div className="phase2"><div className="p2-inline"><span /> <button disabled={!ready || busy || loading} aria-expanded={open} onClick={() => { setDraft(layout); setOpen(v => !v); }}>自定义首页</button></div>{error && <p role="alert">{error}{!ready && <button disabled={loading} onClick={() => void load()}>重新加载首页设置</button>}</p>}{open && <section className="p2-card"><div className="p2-heading"><h3>首页组件</h3><button disabled={busy} onClick={() => setDraft(DEFAULT_LAYOUT)}>恢复默认</button></div><div className="p2-grid">{(['main', 'side'] as const).map(group => <div key={group}>{draft[group].map((key, index) => <div className="p2-layout-row" key={key}><label><input type="checkbox" checked={!draft.hidden.includes(key)} disabled={busy} onChange={() => setDraft({ ...draft, hidden: draft.hidden.includes(key) ? draft.hidden.filter(k => k !== key) : [...draft.hidden, key] })}/>{HOME_WIDGETS[key]}</label><button aria-label={`上移${HOME_WIDGETS[key]}`} disabled={busy || index === 0} onClick={() => move(group, key, -1)}>↑</button><button aria-label={`下移${HOME_WIDGETS[key]}`} disabled={busy || index === draft[group].length - 1} onClick={() => move(group, key, 1)}>↓</button></div>)}</div>)}</div><div className="p2-inline"><button disabled={busy} onClick={() => setOpen(false)}>取消</button><button className="primary" disabled={busy} onClick={save}>保存布局</button></div></section>}</div>;
    return { slot, controls };
}
