"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { TaskBacklog } from "../components/TaskBacklog";
import { TaskHistory } from "../components/TaskHistory";
import { TaskHorizonTabs } from "../components/TaskHorizonTabs";
import { TaskRows } from "../components/TaskRows";
type Props = {
    controller: Pick<WorkspaceController, "view" | "horizon" | "taskHistoryOpen" | "setTaskHistoryOpen" | "completed" | "openNewTask" | "visibleTasks" | "activeCompleted" | "tasks" | "currentTaskDay" | "reloadWorkspace" | "openTaskEditor"> & Parameters<typeof TaskRows>[0]['controller'] & Parameters<typeof TaskHistory>[0]['controller'] & Parameters<typeof TaskHorizonTabs>[0]['controller'];
};
export function TasksView({ controller }: Props) {
    const { view, horizon, taskHistoryOpen, setTaskHistoryOpen, completed, openNewTask, visibleTasks, activeCompleted, tasks, currentTaskDay, reloadWorkspace, openTaskEditor } = controller;
    return <>{view === "个人任务" && (<section className="full-view">
              <div className="view-title">
                <div>
                  <p>TODAY & TASKS</p>
                <h1>{horizon}任务</h1>

                </div>
                <div className="task-title-actions">
                  <button className={`secondary-action ${taskHistoryOpen ? "active" : ""}`} onClick={() => setTaskHistoryOpen((open) => !open)}>
                    ◷ 完成历史 <span>{completed}</span>
                  </button>
                  <button className="primary" onClick={() => openNewTask()}>
                    ＋ 新建任务
                  </button>
                </div>
              </div>
              <div className="task-overview">
                <article>
                  <small>当前任务</small>
                  <strong>{visibleTasks.length - activeCompleted}</strong>
                </article>
                <article>
                  <small>今日待办</small>
                  <strong>
                    {visibleTasks.filter((task) => task.horizon === "今日" && !task.done).length}
                  </strong>
                </article>
                <article>
                  <small>历史完成</small>
                  <strong>{completed}</strong>
                </article>
              </div>
              <TaskBacklog tasks={tasks} today={currentTaskDay} onChanged={reloadWorkspace} onEdit={id => {
                const task = tasks.find(t => t.id === id);
                if (task)
                    openTaskEditor(task);
            }}/>
              <section className="panel tasks-panel">
                <div className="active-task-label">
                  <span>ACTIVE TASKS</span>

                </div>
                {<TaskHorizonTabs controller={controller}/>}
                {<TaskRows controller={controller}/>}
              </section>
              {taskHistoryOpen && <TaskHistory controller={controller}/>}
            </section>)}</>;
}
