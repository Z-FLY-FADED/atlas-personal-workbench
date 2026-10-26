"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "toast" | "undoTask" | "toggleTask">;
};
export function WorkspaceToast({ controller }: Props) {
    const { toast, undoTask, toggleTask } = controller;
    return <>{toast && (<div role="status" className={`toast ${/失败|错误|不可用/.test(toast) ? "error" : /提醒|请先/.test(toast) ? "notice" : "success"} ${undoTask ? "with-action" : ""}`}>
          <span>{/失败|错误|不可用/.test(toast) ? "!" : /提醒|请先/.test(toast) ? "◷" : "✓"}</span>
          <b>{toast}</b>
          {undoTask && (<button onClick={() => toggleTask(undoTask)}>↶ 撤销</button>)}
        </div>)}</>;
}
