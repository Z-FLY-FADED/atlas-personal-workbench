"use client";
import type { Horizon } from "../../../contracts/workspace";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "horizon" | "setHorizon" | "visibleTasks">;
};
export function TaskHorizonTabs({ controller }: Props) {
    const { horizon, setHorizon, visibleTasks } = controller;
    return (<div className="tabs" role="tablist" aria-label="任务时间范围">
      {(["今日", "本周", "年度"] as Horizon[]).map((item) => (<button key={item} className={horizon === item ? "active" : ""} onClick={() => setHorizon(item)}>
          {item}任务{" "}
          <span>
            {visibleTasks.filter((task) => task.horizon === item && !task.done).length}
          </span>
        </button>))}
    </div>);
}
