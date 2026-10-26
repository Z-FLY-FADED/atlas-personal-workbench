"use client";
import { IndustryWorkspace } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "view" | "setToast">;
};
export function IndustryView({ controller }: Props) {
    const { view, setToast } = controller;
    return <>{view === "行业速览" && <IndustryWorkspace onNotify={setToast}/>}</>;
}
