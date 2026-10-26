"use client";
import { KnowledgeLibrary } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { KnowledgeGraph } from "../components/KnowledgeGraph";
import { knowledgeKey } from "../domain/identity";
import { getKnowledgeTextbookMedia } from "../domain/visualProfiles";
type Props = {
    controller: Pick<WorkspaceController, "view" | "knowledge" | "knowledgePreferences" | "libraryQuery" | "setLibraryQuery" | "activeCategory" | "setActiveCategory" | "setSelectedKnowledge" | "setDocumentModal" | "openKnowledgeCapture" | "workspaceRequest" | "setKnowledgePreferences" | "setKnowledge" | "setToast"> & Parameters<typeof KnowledgeGraph>[0]['controller'];
};
export function KnowledgeView({ controller }: Props) {
    const { view, knowledge, knowledgePreferences, libraryQuery, setLibraryQuery, activeCategory, setActiveCategory, setSelectedKnowledge, setDocumentModal, openKnowledgeCapture, workspaceRequest, setKnowledgePreferences, setKnowledge, setToast } = controller;
    return <>{view === "知识库" && <KnowledgeLibrary items={knowledge} preferences={knowledgePreferences} query={libraryQuery} onQuery={setLibraryQuery} category={activeCategory} onCategory={setActiveCategory} onOpen={setSelectedKnowledge} onDocument={() => setDocumentModal(true)} onCapture={() => openKnowledgeCapture()} renderGraph={() => <KnowledgeGraph controller={controller}/>} getMedia={getKnowledgeTextbookMedia} onSavePreference={async (preference) => {
                try {
                    await workspaceRequest('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'knowledge-preference', ...preference }) });
                    setKnowledgePreferences(items => [...items.filter(item => item.knowledgeKey !== preference.knowledgeKey), preference]);
                    setKnowledge(items => items.map(item => knowledgeKey(item) === preference.knowledgeKey ? { ...item, primaryCategory: preference.primaryCategory, secondaryCategory: preference.secondaryCategory } : item));
                    setToast('分类与封面设置已保存');
                    return true;
                }
                catch {
                    setToast('设置保存失败，请重试');
                    return false;
                }
            }}/>}</>;
}
