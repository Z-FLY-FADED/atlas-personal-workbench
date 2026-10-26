"use client";
import { Component, type ReactNode } from 'react';
export class FeatureBoundary extends Component<{
    children: ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: Error) { console.error('Workspace page failed', error); }
    render() {
        if (!this.state.failed)
            return this.props.children;
        return <div className="workspace-data-status" role="alert">
      <span>页面暂时无法打开，请重新加载。你也可以从侧栏打开其他页面。</span>
      <button onClick={() => window.location.reload()}>重新加载</button>
    </div>;
    }
}
