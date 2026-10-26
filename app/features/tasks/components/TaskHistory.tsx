"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "completedHistory" | "tasks" | "toggleTask">;
};
export function TaskHistory({ controller }: Props) {
    const { completedHistory, tasks, toggleTask } = controller;
    return (<section className="task-history panel" aria-label="完成历史">
      <header>
        <div>
          <small>COMPLETION HISTORY</small>
          <h3>完成历史</h3>

        </div>
        <span>{completedHistory.length} 项</span>
      </header>
      <div className="history-list">
        {completedHistory.map((entry) => {
            const task = tasks.find((item) => item.id === entry.taskId);
            return (<article key={`${entry.taskId}-${entry.id}`}>
              <span className="history-check">✓</span>
              <div>
                <b>{entry.title}</b>
                <small>{entry.detail}</small>
                <em>
                  {entry.horizon} · 完成于 {entry.completedAt || "历史记录"}
                </em>
              </div>
              <button disabled={!task?.done} onClick={() => task?.done && toggleTask(task)} aria-label={`撤回完成任务${entry.title}`}>
                {task?.done ? "↶ 撤回完成" : "已回到当前"}
              </button>
            </article>);
        })}
        {!completedHistory.length && (<div className="empty-state">
            暂无完成记录
          </div>)}
      </div>
    </section>);
}
