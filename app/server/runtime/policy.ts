import { DEFAULT_RUNTIME_POLICY, normalizeRuntimePolicy, type RuntimePolicy } from '../../contracts/runtime';

export async function readRuntimePolicy(db: D1Database, owner: string | null): Promise<RuntimePolicy> {
    if (!owner) return { ...DEFAULT_RUNTIME_POLICY };
    const row = await db.prepare("SELECT value FROM workspace_settings WHERE owner_id=? AND key='runtime-policy'").bind(owner).first<{ value: string }>();
    try { return normalizeRuntimePolicy(row ? JSON.parse(row.value) : null); }
    catch { return { mode: 'offline', automaticAI: false }; }
}
export async function saveRuntimePolicy(db: D1Database, owner: string, input: unknown) {
    const policy = normalizeRuntimePolicy(input);
    await db.prepare("INSERT INTO workspace_settings (id,owner_id,key,value) VALUES (?,?,'runtime-policy',?) ON CONFLICT(owner_id,key) DO UPDATE SET value=excluded.value")
        .bind(crypto.randomUUID(), owner, JSON.stringify(policy)).run();
    return policy;
}
export function allowsAI(policy: RuntimePolicy, scheduled = false) {
    return policy.mode === 'ai' && (!scheduled || policy.automaticAI);
}
