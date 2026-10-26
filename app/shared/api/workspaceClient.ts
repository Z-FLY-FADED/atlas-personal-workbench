import { requestJson, type RequestOptions } from "./httpClient";
export function apiJson<T>(url: string, payload?: unknown, options: RequestOptions = {}): Promise<T> {
    return requestJson<T>(url, { ...options, ...(payload === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) });
}
export function errorMessage(error: unknown) {
    if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
        return '网络连接失败，请检查连接后重试';
    return error instanceof Error ? error.message : '请求失败，请重试';
}
