"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "aiScheduleModal" | "setAiScheduleModal" | "setEditingSchedule" | "editingSchedule" | "saveAISchedule" | "aiConnectionId" | "aiData">;
};
export function AIScheduleDialog({ controller }: Props) {
    const { aiScheduleModal, setAiScheduleModal, setEditingSchedule, editingSchedule, saveAISchedule, aiConnectionId, aiData } = controller;
    return <>{aiScheduleModal && (<div className="modal-backdrop" onMouseDown={() => {
                setAiScheduleModal(false);
                setEditingSchedule(null);
            }}>
          <form key={editingSchedule?.id || "new-schedule"} className="modal ai-schedule-modal" onSubmit={saveAISchedule} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>AUTOMATED MODEL RUN</small>
                <h2>{editingSchedule ? "编辑定时查询" : "新建定时查询"}</h2>
              </div>
              <button type="button" onClick={() => {
                setAiScheduleModal(false);
                setEditingSchedule(null);
            }}>
                ×
              </button>
            </div>
            <label>
              任务名称
              <input name="title" required autoFocus defaultValue={editingSchedule?.title || "每日行业资讯核验"} placeholder="例如：每日行业资讯核验"/>
            </label>
            <label>
              执行模型
              <select name="connectionId" required defaultValue={editingSchedule?.connectionId ||
                aiConnectionId ||
                aiData?.connections[0]?.id ||
                0}>
                <option value={0}>选择模型</option>
                {aiData?.connections.map((item) => (<option key={item.id} value={item.id}>
                    {item.name} · {item.model}
                  </option>))}
              </select>
            </label>
            <label>
              查询指令
              <textarea name="prompt" required rows={6} defaultValue={editingSchedule?.prompt ||
                "检索汽车、机器人和半导体行业最新官方信息，交叉核验后输出事实、影响、来源和待确认事项。"}/>
            </label>
            <div className="form-grid">
              <label>
                运行频率
                <select name="cadence" defaultValue={editingSchedule?.cadence || "daily"}>
                  <option value="hourly">每小时</option>
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </select>
              </label>
              <label>
                执行时间（北京时间）
                <input name="timeOfDay" type="time" defaultValue={editingSchedule?.timeOfDay || "08:00"}/>
              </label>
            </div>
            <label>
              每周执行日
              <input name="weekdays" defaultValue={editingSchedule?.weekdays || "1,2,3,4,5"} placeholder="1,2,3,4,5（周一至周五）"/>
              <small className="field-help">
                使用 0—6
                表示周日至周六，逗号分隔；每小时或每天运行时会忽略此项。
              </small>
            </label>
            <label className="check-label">
              <input name="useWeb" type="checkbox" defaultChecked={editingSchedule?.useWeb ?? true}/>
              使用模型联网检索能力（当前 OpenAI Responses API 支持）
            </label>
            <button className="submit" type="submit">
              启用定时查询 <span>→</span>
            </button>
          </form>
        </div>)}</>;
}
