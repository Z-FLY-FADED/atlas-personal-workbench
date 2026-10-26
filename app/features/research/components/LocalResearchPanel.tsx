"use client";
import { useState } from 'react';
import { requestJson } from '../../../shared/api/httpClient';
export function LocalResearchPanel() {
    const [query, setQuery] = useState(''), [result, setResult] = useState(''), [busy, setBusy] = useState(false);
    async function search() {
        setBusy(true);
        try {
            const data = await requestJson<{ result: string }>('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }), timeoutMs: 40000 });
            setResult(data.result);
        } catch (error) { setResult(error instanceof Error ? error.message : '检索失败，请检查本机服务'); }
        finally { setBusy(false); }
    }
    return <section className="panel round2-panel"><h3>本地资料检索</h3><p>按关键词查找任务、项目、笔记、知识和已采集资讯。输入公开网页地址可提取原文；离线模式只检索已保存的内容。</p>
        <textarea aria-label="本地检索内容" value={query} rows={3} maxLength={2000} onChange={event => setQuery(event.target.value)} placeholder="例如：毕业论文、PMSM、电机控制，或公开网页地址"/>
        <button className="primary" disabled={busy || !query.trim()} onClick={() => void search()}>{busy ? '正在检索…' : '本地检索与公开网页提取'}</button>
        {result && <article className="ai-result" role="status"><small>规则匹配与原文摘录 · 无 AI 调用</small><pre>{result}</pre></article>}
    </section>;
}
