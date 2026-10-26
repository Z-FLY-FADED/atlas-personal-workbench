"use client";
import { useAIWorkspace } from "../features/ai/hooks/useAIWorkspace";
import { useCareerWorkspace } from "../features/career/hooks/useCareerWorkspace";
import { useKnowledgeActions } from "../features/knowledge/hooks/useKnowledgeActions";
import { useKnowledgeSelectors } from "../features/knowledge/hooks/useKnowledgeSelectors";
import { useLanguageLearning } from "../features/learning/hooks/useLanguageLearning";
import { useMarketWorkspace } from "../features/market/hooks/useMarketWorkspace";
import { useTaskActions } from "../features/tasks/hooks/useTaskActions";
import { useTaskSelectors } from "../features/tasks/hooks/useTaskSelectors";
import { useCollectionsWorkspace } from "../features/workspace/hooks/useCollectionsWorkspace";
import { useWorkspaceSession } from "./useWorkspaceSession";
import { useWorkspaceState } from './useWorkspaceState';
export function useWorkspaceController() {
    const state = useWorkspaceState();
    const session = useWorkspaceSession(state);
    const base = { ...state, ...session };
    const taskSelectors = useTaskSelectors(base);
    const knowledgeSelectors = useKnowledgeSelectors(base);
    const learning = useLanguageLearning(base);
    const career = useCareerWorkspace(base);
    const ai = useAIWorkspace(base);
    const market = useMarketWorkspace(base);
    const taskActions = useTaskActions(base);
    const collections = useCollectionsWorkspace({ ...base, ...taskActions });
    const knowledgeActions = useKnowledgeActions({ ...base, ...knowledgeSelectors });
    return { ...base, ...taskSelectors, ...knowledgeSelectors, ...learning, ...career, ...ai, ...market, ...taskActions, ...collections, ...knowledgeActions };
}
export type WorkspaceController = ReturnType<typeof useWorkspaceController>;
