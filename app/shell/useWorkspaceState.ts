"use client";
import { useAiState } from "../features/ai/hooks/useAiState";
import { useCareerState } from "../features/career/hooks/useCareerState";
import { useKnowledgeState } from "../features/knowledge/hooks/useKnowledgeState";
import { useLearningState } from "../features/learning/hooks/useLearningState";
import { useMarketState } from "../features/market/hooks/useMarketState";
import { useTasksState } from "../features/tasks/hooks/useTasksState";
import { useFocusTimer } from "../features/workspace/components/WorkspaceWidgets";
import { useCollectionsState } from "../features/workspace/hooks/useCollectionsState";
import { useWorkspaceIO } from "../shared/hooks/useWorkspaceIO";
import { useShellState } from "./useShellState";
export function useWorkspaceState() {
    const ShellState = useShellState();
    const TasksState = useTasksState();
    const KnowledgeState = useKnowledgeState();
    const CollectionsState = useCollectionsState();
    const LearningState = useLearningState();
    const CareerState = useCareerState();
    const MarketState = useMarketState();
    const AiState = useAiState();
    const { setToast } = ShellState;
    const { tasks } = TasksState;
    const { request: workspaceRequest, pending, syncError, lastSaved } = useWorkspaceIO();
    const focusWidget = useFocusTimer(setToast, tasks);
    return { ...ShellState, ...TasksState, ...KnowledgeState, ...CollectionsState, ...LearningState, ...CareerState, ...MarketState, ...AiState, workspaceRequest, pending, syncError, lastSaved, focusWidget };
}
export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
