"use client";
import { useCallback, useRef, useState } from 'react';
import { checkedFetch } from "../api/httpClient";
export { checkedFetch } from "../api/httpClient";
export function workspaceOperationKey(input: RequestInfo | URL, init?: RequestInit) {
    let payload: Record<string, unknown> = {};
    try {
        payload = JSON.parse(String(init?.body || '{}'));
    }
    catch { /* A body is optional. */ }
    const method = (init?.method || 'GET').toUpperCase();
    // Creates receive their permanent ID from the server; a fresh temporary ID on retry is the same operation.
    return `${method}:${payload.type || String(input)}:${method === 'POST' ? '' : payload.id || ''}`;
}
export function useWorkspaceIO() {
    const [pending, setPending] = useState(0);
    const [syncError, setSyncError] = useState('');
    const [lastSaved, setLastSaved] = useState('');
    const failed = useRef(new Set<string>());
    const request = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
        const key = workspaceOperationKey(input, init);
        setPending(count => count + 1);
        try {
            const response = await checkedFetch(input, init);
            failed.current.delete(key);
            setSyncError(failed.current.size ? '仍有操作未保存，请返回表单重试' : '');
            setLastSaved(new Date().toISOString());
            return response;
        }
        catch (error) {
            failed.current.add(key);
            setSyncError(init?.method ? '保存失败，内容已保留，请重试' : '数据加载失败，请重试');
            throw error;
        }
        finally {
            setPending(count => count - 1);
        }
    }, []);
    return { request, pending, syncError, lastSaved };
}
// Legacy and new dialogs share keyboard behavior and preserve uncontrolled form drafts.
export { clearFormDraft, readLocal, writeLocal } from '../lib/storage';
export { useWorkspaceDialogs } from './useWorkspaceDialogs';
