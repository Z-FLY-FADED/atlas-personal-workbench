"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { WebClipDetail } from "./WebCapture";
type Props = {
    controller: Pick<WorkspaceController, "selectedKnowledge" | "setSelectedKnowledge">;
};
export function WebClipDialog({ controller }: Props) {
    const { selectedKnowledge, setSelectedKnowledge } = controller;
    return <>{selectedKnowledge?.sourceType === "网页摘录" && <WebClipDetail item={selectedKnowledge} onClose={() => setSelectedKnowledge(null)}/>}</>;
}
