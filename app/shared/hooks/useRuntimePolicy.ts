"use client";
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_RUNTIME_POLICY, normalizeRuntimePolicy, type RuntimePolicy } from '../../contracts/runtime';
import { requestJson } from '../api/httpClient';
export function useRuntimePolicy() {
    const [policy, setPolicy] = useState<RuntimePolicy>(DEFAULT_RUNTIME_POLICY);
    const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        const load = () => requestJson<{ policy: RuntimePolicy }>('/api/runtime').then(data => {
            if (active) { setPolicy(normalizeRuntimePolicy(data.policy)); setReady(true); setError(''); }
        }).catch(() => { if (active) { setReady(false); setError('运行模式读取失败，请检查本机服务'); } });
        const changed = (event: Event) => { setPolicy(normalizeRuntimePolicy((event as CustomEvent).detail)); setReady(true); setError(''); };
        void load();
        window.addEventListener('atlas-runtime-policy', changed);
        window.addEventListener('online', load);
        return () => { active = false; window.removeEventListener('atlas-runtime-policy', changed); window.removeEventListener('online', load); };
    }, []);
    const save = useCallback(async (next: RuntimePolicy) => {
        setBusy(true); setError('');
        try {
            const data = await requestJson<{ policy: RuntimePolicy }>('/api/runtime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
            const saved = normalizeRuntimePolicy(data.policy);
            setPolicy(saved); setReady(true);
            window.dispatchEvent(new CustomEvent('atlas-runtime-policy', { detail: saved }));
        } catch (error) { setError(error instanceof Error ? error.message : '模式保存失败'); }
        finally { setBusy(false); }
    }, []);
    return { policy, ready, busy, error, save };
}
