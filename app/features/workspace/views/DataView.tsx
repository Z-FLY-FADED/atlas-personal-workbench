"use client";
import { DataCenter } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "view" | "reloadWorkspace">;
};
export function DataView({ controller }: Props) {
    const { view, reloadWorkspace } = controller;
    return <>{view === "数据与恢复" && <DataCenter onChanged={reloadWorkspace}/>}</>;
}
