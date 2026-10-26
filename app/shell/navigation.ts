import { WORKSPACE_VIEWS, type View } from '../contracts/workspace';
export function isWorkspaceView(value: string): value is View {
    return WORKSPACE_VIEWS.some(view => view === value);
}
