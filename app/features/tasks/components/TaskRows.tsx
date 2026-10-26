"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { isTaskCarriedOver } from "../domain/dates";
import { priorityClass } from "../domain/presentation";
type Props = {
    controller: Pick<WorkspaceController, "filteredTasks" | "currentTaskDay" | "toggleTask" | "openTaskEditor">;
    limit?: number;
};
export function TaskRows({ controller, limit }: Props) {
    const { filteredTasks, currentTaskDay, toggleTask, openTaskEditor } = controller;
    return (<div className="task-list">
      {filteredTasks.slice(0, limit).map((task) => {
            const carriedOver = isTaskCarriedOver(task, currentTaskDay);
            return (<div className={`task-row ${carriedOver ? "is-overdue" : ""}`} key={task.id}>
            <button className="checkmark" onClick={() => toggleTask(task)} aria-label={`完成${task.title}`}></button>
            <span className="task-copy">
              <strong>{task.title}</strong>
              <small>{task.detail}</small>
            </span>
            <span className={`priority ${priorityClass(task.priority)}`}>
              <i />
              {task.priority}
            </span>
            <span className="task-date-status">
              {carriedOver && <em>未完成</em>}
              <span className="task-date">{task.date}</span>
            </span>
            <button className="task-edit" onClick={() => openTaskEditor(task)} aria-label={`编辑${task.title}`}>
              ✎
            </button>
          </div>);
        })}
      {!filteredTasks.length && (<div className="empty-state">
          暂无任务
        </div>)}
    </div>);
}
