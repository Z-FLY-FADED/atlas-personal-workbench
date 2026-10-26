"use client";
import { RUNTIME_MODES, type RuntimeMode } from '../../contracts/runtime';
import { useRuntimePolicy } from '../hooks/useRuntimePolicy';
export function RuntimePolicyPanel() {
    const { policy, ready, busy, error, save } = useRuntimePolicy();
    return <section className="panel round2-panel"><h3>运行方式</h3>
        <p>任务、项目、笔记、知识分类、语言练习和统计周报使用本机数据与规则。断网时请保持本机工作台服务运行。</p>
        <label>信息处理方式<select aria-label="信息处理方式" value={policy.mode} disabled={!ready || busy} onChange={event => void save({ mode: event.target.value as RuntimeMode, automaticAI: false })}>
            {Object.entries(RUNTIME_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <p>{policy.mode === 'offline' ? '停止外网采集与 AI 调用，保留本机读写及历史资料。' : policy.mode === 'public' ? '优先 RSS、公开网页与规则解析；AI 调用关闭。' : 'AI 仅在主动查询时调用，基础功能仍使用本机规则。'}</p>
        <label><input type="checkbox" checked={policy.automaticAI} disabled={!ready || busy || policy.mode !== 'ai'} onChange={event => void save({ ...policy, automaticAI: event.target.checked })}/>允许定时任务自动调用 AI</label>
        <p role="status">{error || (busy ? '正在保存…' : ready ? '设置已保存在工作台' : '正在读取设置…')}</p>
    </section>;
}
