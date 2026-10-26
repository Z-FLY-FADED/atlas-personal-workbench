"use client";
import { useEffect, useState } from 'react';
import { MAX_ARCHIVE_BYTES, type WorkspaceArchive } from "../../../contracts/archive";
import { checkedFetch } from "../../../shared/hooks/useWorkspaceIO";
import { downloadText } from "../../../shared/lib/download";
import { RuntimePolicyPanel } from '../../../shared/components/RuntimePolicyPanel';
import { collectLocalState, decodeBackup, encodeBackup, restoreLocalState } from "../client/backup";
type Preview = {
    table: string;
    name: string;
    total: number;
    missing: number;
    existing: number;
};
type Trash = {
    id: string;
    entity: string;
    title: string;
    deletedAt: string;
};
const labels: Record<string, string> = { task: '任务', project: '项目', application: '投递', 'quick-note': '笔记', reminder: '提醒' };
export function DataCenter({ onChanged }: {
    onChanged: () => Promise<unknown>;
}) {
    const [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState('');
    const [file, setFile] = useState<File | null>(null), [archive, setArchive] = useState<WorkspaceArchive | null>(null), [preview, setPreview] = useState<Preview[]>([]), [items, setItems] = useState<Trash[]>([]);
    async function loadTrash() {
        const response = await checkedFetch('/api/data?view=trash');
        setItems(((await response.json()) as {
            items: Trash[];
        }).items);
    }
    useEffect(() => {
        let active = true;
        checkedFetch('/api/data?view=trash').then(response => response.json() as Promise<{
            items: Trash[];
        }>).then(data => {
            if (active)
                setItems(data.items);
        }).catch(error => {
            if (active)
                setStatus(error.message);
        });
        return () => { active = false; };
    }, []);
    async function run(action: () => Promise<void>) {
        setBusy(true);
        setStatus('处理中…');
        try {
            await action();
        }
        catch (error) {
            setStatus(error instanceof Error ? error.message : '操作失败，请重试');
        }
        finally {
            setBusy(false);
        }
    }
    const exportData = () => run(async () => {
        if (password && password.length < 8)
            throw new Error('加密密码至少 8 个字符');
        const response = await checkedFetch('/api/data');
        const backup: WorkspaceArchive = await response.json();
        backup.localState = collectLocalState();
        const content = await encodeBackup(backup, password);
        downloadText(`ATLAS-备份-${new Date().toISOString().slice(0, 10)}${password ? '-加密' : ''}.json`, content, 'application/json');
        setStatus(`已下载${password ? '加密' : ''}备份，包含 ${Object.keys(backup.localState).length} 项本机记录。模型密钥不包含在备份中。`);
    });
    const inspect = () => run(async () => {
        setArchive(null);
        setPreview([]);
        if (!file || file.size > MAX_ARCHIVE_BYTES * 1.5)
            throw new Error('请选择不超过 75 MB 的备份文件');
        const backup = await decodeBackup(await file.text(), password);
        const response = await checkedFetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', archive: { ...backup, localState: undefined } }) });
        const data = await response.json() as {
            summary: Preview[];
        };
        setArchive(backup);
        setPreview(data.summary);
        setStatus('校验通过。恢复只补回缺失记录，已有记录和本机草稿保持原样。');
    });
    const restore = () => run(async () => {
        if (!archive)
            return;
        const response = await checkedFetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore', archive: { ...archive, localState: undefined } }) });
        const data = await response.json() as {
            added: number;
        };
        const local = restoreLocalState(archive.localState);
        await onChanged();
        await loadTrash();
        setStatus(`数据库恢复成功（补回 ${data.added} 项），本机补回 ${local.restored} 项，保留现有 ${local.retained} 项。${local.failed ? `${local.failed} 项本机记录未能写入，请保留备份并腾出浏览器空间后重试。` : '重新进入学习或周报页面即可读取恢复内容。'}`);
        setPreview([]);
        setArchive(null);
    });
    return <section className="full-view round2-page"><div className="view-title"><div><p>DATA & RECOVERY</p><h1>数据与恢复</h1></div></div>
    <RuntimePolicyPanel />
    <section className="panel round2-panel"><h3>导出与恢复</h3><p>备份个人数据与本机记录，不含模型密钥和运行日志。</p><label>备份密码（可选）<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="留空导出普通 JSON；填写后加密" disabled={busy}/></label><p className="round2-hint">加密文件需要相同密码才能恢复，请自行保管。</p><div className="round2-actions"><button className="primary" disabled={busy} onClick={exportData}>下载个人数据备份</button><input type="file" aria-label="选择备份文件" accept="application/json,.json" disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setArchive(null); setPreview([]); }}/><button disabled={busy || !file} onClick={inspect}>校验并预览</button></div><p role="status" className="round2-status">{status}</p>
    {archive && <div><p>备份时间：{new Date(archive.createdAt).toLocaleString('zh-CN')} · 本机记录：{Object.keys(archive.localState || {}).length} 项</p><div className="round2-table-wrap"><table><thead><tr><th>内容</th><th>备份数量</th><th>将补回</th><th>已有，保留</th></tr></thead><tbody>{preview.filter(row => row.total > 0).map(row => <tr key={row.table}><td>{row.name}</td><td>{row.total}</td><td>{row.missing}</td><td>{row.existing}</td></tr>)}</tbody></table></div><button className="primary" disabled={busy} onClick={restore}>确认补回缺失记录</button><button disabled={busy} onClick={() => { setArchive(null); setPreview([]); }}>取消恢复</button></div>}
    </section><section className="panel round2-panel"><div className="round2-actions"><h3>回收站 · {items.length} 项</h3><button disabled={busy} onClick={() => run(async () => { await loadTrash(); setStatus('回收站已刷新'); })}>刷新</button></div>{items.map(item => <article className="recycle-row" key={item.id}><div><b>{item.title}</b><small>{labels[item.entity] || item.entity} · {new Date(item.deletedAt).toLocaleString('zh-CN')}</small></div><button disabled={busy} onClick={() => run(async () => { await checkedFetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore-trash', id: item.id }) }); await loadTrash(); await onChanged(); setStatus('记录已恢复，原编号和历史已保留'); })}>恢复</button></article>)}{!items.length && <p>回收站为空</p>}</section>
  </section>;
}
