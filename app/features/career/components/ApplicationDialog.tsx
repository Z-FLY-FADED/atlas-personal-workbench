"use client";
import type { ApplicationStatus } from "../../../contracts/workspace";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "applicationModal" | "setApplicationModal" | "setEditingApplication" | "editingApplication" | "addApplication" | "applicationDraft" | "setApplicationDraft" | "deleteApplication" | "applicationSaving">;
};
export function ApplicationDialog({ controller }: Props) {
    const { applicationModal, setApplicationModal, setEditingApplication, editingApplication, addApplication, applicationDraft, setApplicationDraft, deleteApplication, applicationSaving } = controller;
    return <>{applicationModal && (<div className="modal-backdrop" onMouseDown={() => {
                setApplicationModal(false);
                setEditingApplication(null);
            }}>
          <form key={editingApplication?.id || "new-application"} className="modal application-modal" onSubmit={addApplication} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>
                  {editingApplication ? "EDIT APPLICATION" : "NEW APPLICATION"}
                </small>
                <h2>{editingApplication ? "编辑投递记录" : "新增投递记录"}</h2>
              </div>
              <button type="button" onClick={() => {
                setApplicationModal(false);
                setEditingApplication(null);
            }}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <label>
                公司
                <input name="company" required autoFocus value={applicationDraft.company} onChange={(event) => setApplicationDraft((draft) => ({ ...draft, company: event.target.value }))} placeholder="公司名称"/>
              </label>
              <label>
                职位
                <input name="role" required value={applicationDraft.role} onChange={(event) => setApplicationDraft((draft) => ({ ...draft, role: event.target.value }))} placeholder="目标岗位"/>
              </label>
            </div>
            <div className="form-grid">
              <label>
                当前状态
                <select name="status" value={applicationDraft.status} onChange={(event) => setApplicationDraft((draft) => ({
                ...draft,
                status: event.target.value as ApplicationStatus,
            }))}>
                  <option>待投递</option>
                  <option>已投递</option>
                  <option>笔试</option>
                  <option>面试</option>
                  <option>Offer</option>
                  <option>结束</option>
                </select>
              </label>
              <label>
                投递渠道
                <input name="channel" value={applicationDraft.channel} onChange={(event) => setApplicationDraft((draft) => ({ ...draft, channel: event.target.value }))} placeholder="官网 / 内推 / 招聘平台"/>
              </label>
            </div>
            <div className="form-grid">
              <label>
                投递日期
                <input type="date" name="appliedAt" value={applicationDraft.appliedAt} onChange={(event) => setApplicationDraft((draft) => ({ ...draft, appliedAt: event.target.value }))}/>
              </label>
              <label>
                下一步
                <input name="nextAction" value={applicationDraft.nextAction} onChange={(event) => setApplicationDraft((draft) => ({ ...draft, nextAction: event.target.value }))} placeholder="例如：周五前跟进"/>
              </label>
            </div>
            <label>
              备注
              <textarea name="notes" rows={4} value={applicationDraft.notes} onChange={(event) => setApplicationDraft((draft) => ({ ...draft, notes: event.target.value }))} placeholder="简历版本、岗位要点、联系人或面试准备…"/>
            </label>
            <div className={`application-modal-actions${editingApplication ? " has-delete" : ""}`}>
              {editingApplication && (<button className="application-modal-delete" type="button" onClick={() => void deleteApplication(editingApplication)}>
                  删除记录
                </button>)}
              <button className="submit" type="submit" disabled={applicationSaving}>
                {applicationSaving
                ? "正在保存…"
                : editingApplication
                    ? "保存记录修改"
                    : "保存投递记录"}{" "}
                <span>→</span>
              </button>
            </div>
          </form>
        </div>)}</>;
}
