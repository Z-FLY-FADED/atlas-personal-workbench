"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { ChatGPTSubscriptionAccount } from "../components/ChatGPTSubscriptionAccount";
import { formatAIRunTime, providerLabel } from "../domain/models";
import { RuntimePolicyPanel } from '../../../shared/components/RuntimePolicyPanel';
import { useRuntimePolicy } from '../../../shared/hooks/useRuntimePolicy';
import { LocalResearchPanel } from '../../research/components/LocalResearchPanel';
type Props = {
    controller: Pick<WorkspaceController, "view" | "aiError" | "aiLoading" | "reloadAI" | "activeAIConnection" | "setEditingConnection" | "setAiConnectionModal" | "aiData" | "setEditingSchedule" | "setAiScheduleModal" | "aiUseWeb" | "switchAIConnection" | "aiAction" | "aiRunning" | "aiConnectionId" | "setAiUseWeb" | "aiPrompt" | "setAiPrompt" | "runAIQuery" | "aiResult">;
};
export function AIView({ controller }: Props) {
    const { policy, ready: policyReady } = useRuntimePolicy();
    const { view, aiError, aiLoading, reloadAI, activeAIConnection, setEditingConnection, setAiConnectionModal, aiData, setEditingSchedule, setAiScheduleModal, aiUseWeb, switchAIConnection, aiAction, aiRunning, aiConnectionId, setAiUseWeb, aiPrompt, setAiPrompt, runAIQuery, aiResult } = controller;
    return <>{view === "AI 模型" && (<section className="full-view ai-center-view">
              {aiError && <div className="workspace-data-status" role="alert"><span>{aiError}</span><button disabled={aiLoading} onClick={() => void reloadAI().catch(() => undefined)}>重试加载模型配置</button></div>}
              <section className="panel ai-center-hero">
                <div className="ai-center-hero-copy">
                  <p>AI MODEL ORCHESTRATOR</p>
                  <h1>AI 模型中心</h1>

                  <div className="ai-center-active-model" aria-live="polite">
                    <span className={activeAIConnection?.status === "connected" ? "online" : ""}/>
                    <div>
                      <small>{aiLoading ? "正在检查模型状态" : activeAIConnection?.status === "error" ? "当前模型需要检查" : activeAIConnection ? "当前默认模型" : "尚未连接模型"}</small>
                      <b>{activeAIConnection ? `${providerLabel(activeAIConnection.provider)} · ${activeAIConnection.model}` : "连接模型后即可开始查询"}</b>
                    </div>
                  </div>
                </div>
                <div className="ai-center-hero-actions">
                  <button type="button" className="primary" onClick={() => document.getElementById("ai-query-workbench")?.scrollIntoView({ behavior: "smooth", block: "start" })}>✦ 立即查询</button>
                  <button type="button" onClick={() => {
                setEditingConnection(null);
                setAiConnectionModal(true);
            }}>＋ 连接模型</button>
                  <button type="button" disabled={!aiData?.connections.length} onClick={() => {
                setEditingSchedule(null);
                setAiScheduleModal(true);
            }}>◷ 新建自动任务</button>
                </div>
                <div className="ai-center-overview">
                  <article><span>模型连接</span><b>{aiData?.connections.length || 0}</b><small>{aiData?.connections.filter((item) => item.status === "connected").length || 0} 个已验证</small></article>
                  <article><span>自动任务</span><b>{aiData?.schedules.filter((item) => item.enabled).length || 0}</b><small>{aiData?.schedules.length || 0} 个任务</small></article>
                  <article><span>运行记录</span><b>{aiData?.runs.length || 0}</b><small>{aiData?.runs.filter((item) => item.status === "succeeded").length || 0} 次成功</small></article>
                  <article><span>联网查询</span><b>{aiUseWeb ? "开启" : "关闭"}</b></article>
                </div>
              </section>
              <RuntimePolicyPanel />
              <LocalResearchPanel />
              <ChatGPTSubscriptionAccount account={aiData?.account}/>
              <div className="ai-account-strip panel">
                <span className={activeAIConnection ? "connected" : "local"}>
                  GPT
                </span>
                <div className="ai-account-copy">
                  <b>GPT 账户与模型</b>
                  <small>
                    {activeAIConnection
                ? `${activeAIConnection.name} · ${activeAIConnection.model}`
                : "尚未选择已登录 GPT 账号"}
                  </small>
                </div>
                <label className="ai-account-switcher">
                  <span>当前账户 / 模型</span>
                  <select value={activeAIConnection?.id || 0} onChange={(event) => switchAIConnection(Number(event.target.value))} aria-label="切换 GPT 账户与模型">
                    <option value={0}>选择账户</option>
                    {aiData?.connections.map((item) => (<option key={item.id} value={item.id}>
                        {providerLabel(item.provider)} · {item.name} ·{" "}
                        {item.model}
                      </option>))}
                    <option value={-1}>＋ 已登录 GPT 账号</option>
                  </select>
                </label>
                <button className="ai-add-account" type="button" onClick={() => {
                setEditingConnection(null);
                setAiConnectionModal(true);
            }}>
                  ＋ 已登录账号
                </button>
                <em>密钥服务端加密</em>
              </div>
              <section className="ai-connection-section" id="ai-model-connections">
                <div className="panel-head">
                  <div>
                    <h3>模型连接</h3>
                  </div>
                  <span>{aiData?.connections.length || 0} 个模型</span>
                </div>
                <div className="ai-connection-grid">
                  {aiLoading ? (<div className="empty-state">正在加载模型连接…</div>) : (aiData?.connections.map((connection) => (<article className={`ai-connection-card panel ${connection.isActive ? "active" : ""}`} key={connection.id}>
                        <header>
                          <span>
                            {providerLabel(connection.provider).slice(0, 2)}
                          </span>
                          <div>
                            <small>{providerLabel(connection.provider)}</small>
                            <h3>{connection.name}</h3>
                          </div>
                          <em className={connection.status === "error" ? "error" : "ok"}>
                            {connection.status === "connected"
                    ? "● 已验证"
                    : connection.status === "error"
                        ? "● 需检查"
                        : "● 已配置"}
                          </em>
                        </header>
                        <strong>{connection.model}</strong>
                        <p>{connection.baseUrl || "使用厂商官方接口"}</p>
                        <footer>
                          {connection.isActive ? (<b>✓ 当前默认</b>) : (<button onClick={() => aiAction({ action: "set-active", id: connection.id }, "默认模型已切换")}>
                              设为默认
                            </button>)}
                          <button onClick={() => {
                    setEditingConnection(connection);
                    setAiConnectionModal(true);
                }}>
                            编辑
                          </button>
                          <button className="danger-link" onClick={() => aiAction({
                    action: "delete-connection",
                    id: connection.id,
                }, "模型连接已删除")}>
                            删除
                          </button>
                        </footer>
                      </article>)))}
                  {!aiLoading && !aiData?.connections.length && (<div className="ai-onboarding panel">
                      <span>✦</span>
                      <h3>连接第一个 AI 模型</h3>
                      <p>
                        支持 OpenAI、DeepSeek、Claude、Gemini 和 OpenAI
                        兼容接口。API Key 只会加密后保存。
                      </p>
                      <button className="primary" onClick={() => setAiConnectionModal(true)}>
                        添加模型连接
                      </button>
                    </div>)}
                </div>
              </section>
              <div className="ai-work-grid">
                <section className="panel ai-query-panel" id="ai-query-workbench">
                  <div className="panel-head">
                    <div>
                      <h3>AI 辅助查询（可选）</h3>

                    </div>
                    <span className={aiRunning ? "ai-pulse" : ""}>
                      {aiRunning ? "运行中" : "READY"}
                    </span>
                  </div>
                  <div className="ai-query-controls">
                    <select value={aiConnectionId} onChange={(event) => switchAIConnection(Number(event.target.value))} aria-label="选择查询账户与模型">
                      <option value={0}>选择账户与模型</option>
                      {aiData?.connections.map((item) => (<option key={item.id} value={item.id}>
                          {providerLabel(item.provider)} · {item.name} ·{" "}
                          {item.model}
                        </option>))}
                      <option value={-1}>＋ 已登录 GPT 账号</option>
                    </select>
                    <label>
                      <input type="checkbox" checked={aiUseWeb} onChange={(event) => setAiUseWeb(event.target.checked)}/>
                      联网检索（OpenAI 支持）
                    </label>
                  </div>
                  <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={7} placeholder="例如：检索本周汽车、机器人和半导体行业的重要官方信息，按影响程度排序并附来源线索。"/>
                  <div className="ai-prompt-templates">
                    {["行业资讯核验", "岗位信息整理", "技术资料总结"].map((item) => (<button key={item} onClick={() => setAiPrompt(item === "行业资讯核验"
                    ? "检索最近一周汽车、机器人和半导体行业的重要官方信息，说明事实、影响和需要继续核验的部分。"
                    : item === "岗位信息整理"
                        ? "整理汽车、制造、机器人和科技行业的研发、测试、产品、质量、工艺岗位信息，按匹配度输出。"
                        : "将输入的技术资料整理为原理、数学模型、主流方法、工程步骤和适用边界。")}>
                          {item}
                        </button>))}
                  </div>
                  <button className="submit ai-run-button" onClick={runAIQuery} disabled={aiRunning || !policyReady || policy.mode !== 'ai'}>
                    {aiRunning ? "模型正在查询…" : "✦ 开始查询"}
                    <span>→</span>
                  </button>
                  {aiResult && (<article className="ai-result">
                      <small>MODEL RESPONSE</small>
                      <pre>{aiResult}</pre>
                    </article>)}
                </section>
                <section className="panel ai-schedule-panel" id="ai-schedule-workbench">
                  {(!policyReady || !policy.automaticAI) && <p className="round2-hint">自动 AI 执行已暂停。可在运行方式中单独启用。</p>}
                  <div className="panel-head">
                    <div>
                      <h3>定时查询</h3>

                    </div>
                    <button onClick={() => {
                setEditingSchedule(null);
                setAiScheduleModal(true);
            }}>
                      ＋ 新建
                    </button>
                  </div>
                  <div className="ai-schedule-list">
                    {aiData?.schedules.map((schedule) => (<article key={schedule.id}>
                        <button className={`schedule-switch ${schedule.enabled ? "on" : ""}`} onClick={() => aiAction({
                    action: "toggle-schedule",
                    id: schedule.id,
                    enabled: !schedule.enabled,
                }, schedule.enabled
                    ? "定时任务已暂停"
                    : "定时任务已恢复")}>
                          <i />
                        </button>
                        <div>
                          <h4>{schedule.title}</h4>
                          <p>
                            {schedule.connectionName} · {schedule.model}
                          </p>
                          <small>
                            下次：
                            {schedule.enabled
                    ? formatAIRunTime(schedule.nextRunAt)
                    : "已暂停"}{" "}
                            · 上次：{formatAIRunTime(schedule.lastRunAt)}
                          </small>
                        </div>
                        <span>
                          {schedule.cadence === "hourly"
                    ? "每小时"
                    : schedule.cadence === "daily"
                        ? `每天 ${schedule.timeOfDay}`
                        : `每周 ${schedule.timeOfDay}`}
                        </span>
                        <div className="schedule-actions">
                          <button disabled={!policyReady || policy.mode !== 'ai'} onClick={() => aiAction({ action: "run-schedule", id: schedule.id }, "定时查询已立即执行")}>
                            立即运行
                          </button>
                          <button onClick={() => {
                    setEditingSchedule(schedule);
                    setAiScheduleModal(true);
                }}>
                            编辑
                          </button>
                          <button onClick={() => aiAction({ action: "delete-schedule", id: schedule.id }, "定时任务已删除")}>
                            删除
                          </button>
                        </div>
                      </article>))}
                    {!aiData?.schedules.length && (<div className="empty-state">
                        暂无定时任务
                      </div>)}
                  </div>
                </section>
              </div>
              <section className="panel ai-history" id="ai-run-history">
                <div className="panel-head">
                  <div>
                    <h3>运行历史</h3>

                  </div>
                  <span>{aiData?.runs.length || 0} 条</span>
                </div>
                <div className="ai-run-table">
                  {aiData?.runs.slice(0, 10).map((run) => (<article key={run.id}>
                      <span className={run.status}>
                        {run.status === "succeeded"
                    ? "✓"
                    : run.status === "failed"
                        ? "!"
                        : "…"}
                      </span>
                      <div>
                        <b>
                          {run.connectionName || "已删除模型"} · {run.model}
                        </b>
                        <p>{run.prompt}</p>
                      </div>
                      <time>{formatAIRunTime(run.startedAt)}</time>
                      <em>
                        {run.status === "succeeded"
                    ? "成功"
                    : run.status === "failed"
                        ? run.error || "失败"
                        : "运行中"}
                      </em>
                    </article>))}
                  {!aiData?.runs.length && (<div className="empty-state">
                      暂无运行记录
                    </div>)}
                </div>
              </section>
            </section>)}</>;
}
