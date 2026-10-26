"use client";
import { useCallback, useEffect, useState } from 'react';
import { checkedFetch, readLocal } from "../../../shared/hooks/useWorkspaceIO";
type Card = {
    id: string;
    front: string;
    back: string;
    dueAt: string;
    revision: number;
    sourceKey: string;
};
type Word = {
    word: string;
    meaning: string;
    sourceKey?: string;
};
export function SpacedReview({ language, words, onOpenSource }: {
    language: string;
    words: Word[];
    onOpenSource?: (key: string) => void;
}) {
    const [items, setItems] = useState<Card[]>([]), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [revealed, setRevealed] = useState(''), [legacy, setLegacy] = useState<Word[]>([]), [now, setNow] = useState(0);
    const [front, setFront] = useState(''), [back, setBack] = useState('');
    const load = useCallback(async () => {
        const response = await checkedFetch(`/api/learning?language=${encodeURIComponent(language)}`);
        const data = await response.json() as {
            items: Card[];
            now: string;
        };
        setItems(data.items);
        setNow(Date.parse(data.now));
        setReady(true);
    }, [language]);
    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(() => {
            const old = readLocal<Record<string, {
                meaning: string;
            }>>(`atlas-learning-review-${language}`, {});
            if (active)
                setLegacy(Object.entries(old).filter(([, item]) => item && typeof item.meaning === 'string').map(([word, item]) => ({ word, meaning: item.meaning })));
            void load().catch(error => {
                if (active)
                    setError(error.message);
            });
        }, 0);
        const clock = window.setInterval(() => setNow(Date.now()), 30000);
        return () => { active = false; clearTimeout(timer); clearInterval(clock); };
    }, [load, language]);
    const due = items.filter(item => Date.parse(item.dueAt) <= now), current = due[0];
    async function refresh() {
        setBusy(true);
        setError('');
        try {
            await load();
        }
        catch (error) {
            setError(error instanceof Error ? error.message : '复习记录读取失败，请重试');
        }
        finally {
            setBusy(false);
        }
    }
    async function act(payload: Record<string, unknown>) {
        setBusy(true);
        setError('');
        try {
            await checkedFetch('/api/learning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            await load();
            setRevealed('');
            return true;
        }
        catch (error) {
            setError(error instanceof Error ? error.message : '保存失败');
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    const addWords = (list: Word[]) => act({ action: 'add', language, items: list.map(item => ({ front: item.word, back: item.meaning, sourceKey: item.sourceKey || '' })) });
    return <section className="panel round2-panel spaced-review" aria-label={`${language}复习`} aria-busy={busy || (!ready && !error)}><div className="spaced-review-heading"><h3>智能间隔复习</h3><button disabled={busy} onClick={refresh}>{busy ? '处理中…' : '刷新队列'}</button></div>{error && <p className="spaced-review-error" role="alert">{error}</p>}
    {current ? <div className="review-flashcard"><h2>{current.front}</h2>{revealed === current.id ? <><div className="review-answer">{current.back}</div>{current.sourceKey && onOpenSource && <button onClick={() => onOpenSource(current.sourceKey)}>打开原资料 ↗</button>}<div className="review-ratings">{['忘记', '困难', '记得', '轻松'].map((label, index) => <button key={label} disabled={busy} onClick={() => act({ action: 'review', id: current.id, revision: current.revision, rating: index + 1, operationId: crypto.randomUUID() })}>{label}</button>)}</div></> : <button className="primary" disabled={busy} onClick={() => setRevealed(current.id)}>显示答案</button>}</div> : ready && <div className="review-flashcard"><h3>{items.length ? '本轮复习已完成' : '开始积累复习卡片'}</h3></div>}
    <div className="round2-actions">{words.length > 0 && <button disabled={!ready || busy} onClick={() => addWords(words)}>加入{language === '专业知识' ? '这些知识' : '今日词汇'}</button>}{legacy.length > 0 && <button disabled={!ready || busy} onClick={() => addWords(legacy)}>导入本机旧复习记录</button>}</div>
    <details><summary>新增自己的复习卡片</summary><form onSubmit={async (event) => {
            event.preventDefault();
            if (await addWords([{ word: front, meaning: back }])) {
                setFront('');
                setBack('');
            }
        }}><label>问题<input required maxLength={500} value={front} onChange={event => setFront(event.target.value)} disabled={busy}/></label><label>答案<textarea required maxLength={10000} value={back} onChange={event => setBack(event.target.value)} disabled={busy} rows={4}/></label><button type="submit" disabled={!ready || busy}>保存卡片</button></form></details>
  </section>;
}
