export type RequestOptions = RequestInit & {
    timeoutMs?: number;
};
async function performRequest<T>(input: RequestInfo | URL, options: RequestOptions, consume: (response: Response) => Promise<T>, fetcher: typeof fetch): Promise<T> {
    const { timeoutMs = 30000, ...init } = options;
    const callerSignal = init.signal || (input instanceof Request ? input.signal : undefined);
    callerSignal?.throwIfAborted();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, controller.signal]) : controller.signal;
    try {
        const response = await fetcher(input, { ...init, signal });
        if (!response.ok) {
            const data = await response.clone().json().catch(() => null) as {
                error?: unknown;
            } | null;
            throw new Error(typeof data?.error === 'string' && data.error ? data.error : `请求失败（${response.status}）`);
        }
        return await consume(response);
    }
    catch (error) {
        callerSignal?.throwIfAborted();
        if (controller.signal.aborted)
            throw new Error('请求超时，请检查连接后重试');
        throw error;
    }
    finally {
        clearTimeout(timer);
    }
}
// Writes are sent exactly once: a timeout does not prove the server failed to save.
export function checkedFetch(input: RequestInfo | URL, options: RequestOptions = {}, fetcher: typeof fetch = fetch) {
    return performRequest(input, options, async (response) => response, fetcher);
}
export function requestJson<T>(input: RequestInfo | URL, options: RequestOptions = {}, fetcher: typeof fetch = fetch): Promise<T> {
    return performRequest(input, options, async (response) => {
        try {
            return await response.json() as T;
        }
        catch {
            throw new Error('响应格式异常，请重试');
        }
    }, fetcher);
}
