"use client";
import Image from 'next/image';
import { useState, type ReactNode } from 'react';
import { useWorkspaceDialogs } from "../../../shared/hooks/useWorkspaceIO";
import { conciseSummary, formatStoredDate } from "../../workspace/domain/workspace";
import { knowledgeKey, knowledgePreference } from "../domain/identity";
import { KNOWLEDGE_TAXONOMY } from "../domain/taxonomy";
type Item = {
    id: number;
    stableKey?: string;
    title: string;
    summary: string;
    content?: string;
    primaryCategory: string;
    secondaryCategory: string;
    createdAt: string;
    source: string;
    sourceType: string;
};
export type KnowledgePreference = {
    knowledgeKey: string;
    primaryCategory: string;
    secondaryCategory: string;
    cover: string;
};
type Media = {
    src: string;
    title: string;
    cardSrc?: string;
    objectPosition?: string;
    cardBackgroundPosition?: string;
};
type Props<T extends Item> = {
    items: T[];
    preferences: KnowledgePreference[];
    query: string;
    onQuery: (value: string) => void;
    category: string;
    onCategory: (value: string) => void;
    onOpen: (item: T) => void;
    onDocument: () => void;
    onCapture: () => void;
    renderGraph: () => ReactNode;
    getMedia: (title: string, context: string) => Media;
    onSavePreference: (value: KnowledgePreference) => Promise<boolean>;
};
export function KnowledgeLibrary<T extends Item>(props: Props<T>) {
    const [view, setView] = useState<'list' | 'cards' | 'graph'>('list');
    const [sort, setSort] = useState('recent');
    const [editing, setEditing] = useState<T | null>(null);
    const [saving, setSaving] = useState(false);
    useWorkspaceDialogs(editing ? 'knowledge-settings' : '', () => {
        if (!saving)
            setEditing(null);
    });
    const all = props.items.map(item => { const pref = knowledgePreference(props.preferences, item); return { ...item, primaryCategory: pref?.primaryCategory || item.primaryCategory, secondaryCategory: pref?.secondaryCategory || item.secondaryCategory, cover: pref?.cover || (/显示器|支架|悬停/.test(item.title) ? 'none' : 'auto') }; });
    const needle = props.query.trim().toLowerCase();
    const visible = all.filter(item => (props.category === '全部' || props.category === item.primaryCategory) && (!needle || `${item.title} ${item.summary} ${item.content} ${item.primaryCategory} ${item.secondaryCategory} ${item.source}`.toLowerCase().includes(needle)));
    if (sort === 'title')
        visible.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    const currentPreference = editing ? knowledgePreference(props.preferences, editing) : null;
    return <section className="full-view knowledge-view knowledge-library">
    <div className="view-title"><div><p>KNOWLEDGE LIBRARY</p><h1>工程知识库</h1></div><div className="knowledge-title-actions"><button className="secondary-action" onClick={props.onDocument}>↑ 添加文档</button><button className="primary" onClick={props.onCapture}>＋ 收录知识</button></div></div>
    <div className="library-toolbar"><label>搜索资料<input aria-label="搜索资料正文" value={props.query} onChange={event => props.onQuery(event.target.value)} placeholder="标题、正文或关键词"/></label><label>排序<select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">收录顺序</option><option value="title">标题名称</option></select></label><div role="group" aria-label="资料展示方式">{(['list', 'cards', 'graph'] as const).map(mode => <button key={mode} aria-pressed={view === mode} className={view === mode ? 'active' : ''} onClick={() => setView(mode)}>{{ list: '列表', cards: '卡片', graph: '关联图谱' }[mode]}</button>)}</div></div>
    <div className="category-row taxonomy-row"><button className={props.category === '全部' ? 'active' : ''} onClick={() => props.onCategory('全部')}>全部 <span>{all.length}</span></button>{KNOWLEDGE_TAXONOMY.map(category => <button key={category.name} className={props.category === category.name ? 'active' : ''} onClick={() => props.onCategory(category.name)}>{category.name} <span>{all.filter(item => item.primaryCategory === category.name).length}</span></button>)}</div>
    <p className="library-result-count" role="status">{`${visible.length} 条资料`}</p>
    {view === 'graph' ? props.renderGraph() : <div className={view === 'list' ? 'knowledge-compact-list' : 'knowledge-grid'}>{visible.map(item => {
                const media = props.getMedia(item.title, `${item.primaryCategory} ${item.secondaryCategory}`);
                const overrides: Record<string, string> = { mechanical: '/knowledge-mechanical-design.webp', electrical: '/knowledge-reference-atlas.webp', embedded: '/knowledge-embedded-interfaces.webp' };
                const src = overrides[item.cover] || media.cardSrc || media.src;
                return <article key={item.id} className={view === 'cards' ? 'knowledge-card' : 'knowledge-list-row'}>
        {view === 'cards' && item.cover !== 'none' && <Image unoptimized className="library-card-image" src={src.replace(/\.png$/, ".webp")} loading="lazy" decoding="async" width={480} height={270} alt={item.cover === 'auto' ? media.title : `${item.primaryCategory}资料封面`}/>}
        <button className="knowledge-open" onClick={() => props.onOpen(item)}><span className="knowledge-list-icon">{KNOWLEDGE_TAXONOMY.find(category => category.name === item.primaryCategory)?.icon || '◇'}</span><div><h3>{item.title}</h3><p>{conciseSummary(item.title, item.summary)}</p><small>{item.primaryCategory} / {item.secondaryCategory} · {item.sourceType} · {formatStoredDate(item.createdAt)}</small></div><span>↗</span></button>
        <button className="knowledge-settings" aria-label={`调整${item.title}的分类与封面`} onClick={() => setEditing(item)}>分类与封面</button>
      </article>;
            })}</div>}
    {view !== 'graph' && !visible.length && <div className="workspace-page-empty"><h2>没有匹配的资料</h2><button onClick={() => { props.onQuery(''); props.onCategory('全部'); }}>清除筛选</button></div>}
    
    {editing && <div className="workspace-entry-layer"><button className="workspace-entry-scrim" onClick={() => {
                if (!saving)
                    setEditing(null);
            }} aria-label="关闭资料设置"/><form className="workspace-entry-modal" onSubmit={async (event) => {
                event.preventDefault();
                if (saving)
                    return;
                const data = new FormData(event.currentTarget);
                setSaving(true);
                try {
                    if (await props.onSavePreference({ knowledgeKey: knowledgeKey(editing), primaryCategory: String(data.get('primaryCategory')), secondaryCategory: String(data.get('secondaryCategory')), cover: String(data.get('cover')) }))
                        setEditing(null);
                }
                finally {
                    setSaving(false);
                }
            }}><header><h2>分类与封面</h2><button type="button" disabled={saving} onClick={() => setEditing(null)} aria-label="关闭资料设置窗口">×</button></header><p>{editing.title}</p><label>一级分类<select name="primaryCategory" defaultValue={currentPreference?.primaryCategory || editing.primaryCategory}>{KNOWLEDGE_TAXONOMY.map(category => <option key={category.name}>{category.name}</option>)}</select></label><label>二级分类<input name="secondaryCategory" required maxLength={80} defaultValue={currentPreference?.secondaryCategory || editing.secondaryCategory}/></label><label>封面<select name="cover" defaultValue={currentPreference?.cover || (/显示器|支架|悬停/.test(editing.title) ? 'none' : 'auto')}><option value="auto">自动匹配</option><option value="none">不显示封面</option><option value="mechanical">机械设计</option><option value="electrical">工程原理图谱</option><option value="embedded">嵌入式系统</option></select></label><footer><button type="submit" disabled={saving}>{saving ? '保存中…' : '保存设置'}</button></footer></form></div>}
  </section>;
}
