export type RuntimeMode = 'offline' | 'public' | 'ai';
export type RuntimePolicy = { mode: RuntimeMode; automaticAI: boolean };
export const DEFAULT_RUNTIME_POLICY: RuntimePolicy = { mode: 'public', automaticAI: false };
export const RUNTIME_MODES: Record<RuntimeMode, string> = {
    offline: '离线使用', public: '公开来源与规则', ai: 'AI 辅助',
};
export function normalizeRuntimePolicy(value: unknown): RuntimePolicy {
    const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const mode = ['offline', 'public', 'ai'].includes(String(input.mode)) ? input.mode as RuntimeMode : 'public';
    return { mode, automaticAI: mode === 'ai' && input.automaticAI === true };
}
export type SourceAvailability = { state: 'fresh' | 'cached' | 'offline' | 'unavailable'; savedAt: string; message: string };
