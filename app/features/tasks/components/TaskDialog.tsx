"use client";
import type { Horizon } from "../../../contracts/workspace";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { REPEAT_RULES } from "../../planning/domain/planning";
import { taskPeriodStartKey } from "../domain/dates";
import { TaskDetails } from "./TaskDetails";
type Props = {
    controller: Pick<WorkspaceController, "taskModal" | "setTaskModal" | "setEditingTask" | "editingTask" | "taskSeed" | "taskDraftHorizon" | "saveTask" | "setTaskDraftHorizon" | "workspaceProjects">;
};
export function TaskDialog({ controller }: Props) {
    const { taskModal, setTaskModal, setEditingTask, editingTask, taskSeed, taskDraftHorizon, saveTask, setTaskDraftHorizon, workspaceProjects } = controller;
    return <>{taskModal && (<div className="modal-backdrop" onMouseDown={() => {
                setTaskModal(false);
                setEditingTask(null);
            }}>
          <form key={editingTask?.id ?? "new"} data-draft-key={`atlas-task-draft-${editingTask?.id || (taskSeed.title ? "note-" + taskSeed.title.slice(0, 60) : taskDraftHorizon)}`} className="modal" onSubmit={saveTask} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <small>{editingTask ? "EDIT TASK" : "NEW TASK"}</small>
                <h2>{editingTask ? "编辑任务" : "新建任务"}</h2>
              </div>
              <button type="button" onClick={() => {
                setTaskModal(false);
                setEditingTask(null);
            }}>
                ×
              </button>
            </div>
            <label>
              任务名称
              <input name="title" required autoFocus defaultValue={editingTask?.title || taskSeed.title} placeholder="准备完成什么？"/>
            </label>
            <label>
              补充说明
              <input name="detail" defaultValue={editingTask?.detail || taskSeed.detail} placeholder="项目、目标或相关背景"/>
            </label>
            <div className="form-grid">
              <label>
                时间范围
                <select name="horizon" defaultValue={editingTask?.horizon || taskDraftHorizon} onChange={event => setTaskDraftHorizon(event.currentTarget.value as Horizon)}>
                  <option>今日</option>
                  <option>本周</option>
                  <option>年度</option>
                </select>
              </label>
              <label>
                优先级
                <select name="priority" defaultValue={editingTask?.priority || "一般"}>
                  <option>优先</option>
                  <option>一般</option>
                  <option>不重要</option>
                </select>
              </label>
            </div>
            <label>
              时间提示
              <input name="date" defaultValue={editingTask?.date || ""} placeholder="例如：今天 14:00"/>
            </label>
            <label>
              所属项目
              <select name="projectId" defaultValue={editingTask?.projectId || ""}>
                <option value="">不关联项目</option>
                {workspaceProjects
                .filter((project) => project.status !== "已完成")
                .map((project) => (<option value={project.id} key={project.id}>
                      {project.title}
                    </option>))}
              </select>
            </label>
            <div className="form-grid">
              <label>计划日期<input name="activeOn" type="date" defaultValue={editingTask?.activeOn || taskPeriodStartKey(taskDraftHorizon)} required/></label>
              <label title="重复规则用于今日任务，按计划日期生成下一次任务">重复规则<select name="repeatRule" disabled={taskDraftHorizon !== '今日'} defaultValue={editingTask?.repeatRule || 'none'}>{Object.entries(REPEAT_RULES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            </div>
            {editingTask ? <TaskDetails key={editingTask.id} taskId={editingTask.id}/> : <label>子任务<textarea name="subtasks" placeholder="每行一个子任务" rows={3} maxLength={20000}/></label>}
            <button className="submit" type="submit">
              {editingTask ? "保存修改" : "创建任务"} <span>→</span>
            </button>
          </form>
        </div>)}</>;
}
