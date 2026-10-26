"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { WebCapture } from "./WebCapture";
type Props = {
    controller: Pick<WorkspaceController, "captureModal" | "pending" | "webCaptureBusy" | "setCaptureModal" | "captureMode" | "setCaptureMode" | "captureSeed" | "addKnowledge" | "workspaceProjects" | "setWebCaptureBusy" | "reloadWorkspace" | "setActiveCategory" | "setLibraryQuery" | "knowledge" | "setSelectedKnowledge" | "setToast">;
};
export function CaptureDialog({ controller }: Props) {
    const { captureModal, pending, webCaptureBusy, setCaptureModal, captureMode, setCaptureMode, captureSeed, addKnowledge, workspaceProjects, setWebCaptureBusy, reloadWorkspace, setActiveCategory, setLibraryQuery, knowledge, setSelectedKnowledge, setToast } = controller;
    return <>{captureModal && (<div className="modal-backdrop" onMouseDown={() => {
                if (!pending && !webCaptureBusy)
                    setCaptureModal(false);
            }}>
          <article className="modal capture-modal" role="dialog" aria-modal="true" aria-label="收录知识" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>收录知识</h2>
              <button type="button" aria-label="关闭收录窗口" disabled={Boolean(pending) || webCaptureBusy} onClick={() => setCaptureModal(false)}>
                ×
              </button>
            </div>
            <div className="capture-tabs" role="group" aria-label="收录方式">
              <button type="button" aria-pressed={captureMode === 'note'} disabled={Boolean(pending) || webCaptureBusy} onClick={() => setCaptureMode('note')}>知识笔记</button>
              <button type="button" aria-pressed={captureMode === 'web'} disabled={Boolean(pending) || webCaptureBusy} onClick={() => setCaptureMode('web')}>网页摘录</button>
            </div>
            <div hidden={captureMode !== 'note'}>
            <form data-draft-key={captureSeed ? "atlas-capture-draft-" + captureSeed.slice(0, 60) : "atlas-capture-draft"} onSubmit={addKnowledge}>
            <div className="form-grid">
              <label>
                内容类型
                <select name="sourceType" defaultValue="手动输入">
                  <option>AI 对话</option>
                  <option>网址</option>
                  <option>手动输入</option>
                </select>
              </label>
              <label>
                原始输入来源
                <select name="source" defaultValue="手动">
                  <option>Codex</option>
                  <option>DeepSeek</option>
                  <option>网页</option>
                  <option>手动</option>
                </select>
              </label>
            </div>
            <label>
              标题（可选）
              <input name="title" placeholder="系统会根据内容生成"/>
            </label>
            <label>
              内容或网址
              <textarea name="content" required placeholder="可粘贴对话、技术资料或公开网址…" defaultValue={captureSeed} rows={6}/>
            </label>
            <button className="submit" type="submit" disabled={Boolean(pending)}>
              {pending ? '保存中…' : '保存到知识库'} <span>→</span>
            </button>
            </form>
            </div>
            <div hidden={captureMode !== 'web'}>
              <WebCapture projects={workspaceProjects} onBusyChange={setWebCaptureBusy} onSaved={async () => { await reloadWorkspace(); setActiveCategory('全部'); setLibraryQuery(''); }} onOpen={id => {
                const item = knowledge.find(k => k.id === id);
                setCaptureModal(false);
                if (item)
                    setSelectedKnowledge(item);
                else
                    setToast('已收录，请从知识库打开');
            }}/>
            </div>
          </article>
        </div>)}</>;
}
