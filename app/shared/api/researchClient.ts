type ReadOptions = {
    signal?: AbortSignal;
    timeoutMs?: number;
    retryDelayMs?: number;
};
// Retry only reads; a failed collection or watchlist write must not be replayed.
export async function readResearchJson<T>(url: string, message: string, options: ReadOptions = {}, fetcher: typeof fetch = fetch): Promise<T> {
    for (let attempt = 0;; attempt += 1) {
        options.signal?.throwIfAborted();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
        const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
        let retryable = true;
        try {
            const response = await fetcher(url, { cache: 'no-store', signal });
            if (!response.ok) {
                retryable = response.status >= 500 || response.status === 408 || response.status === 429;
                throw new Error(message);
            }
            return await response.json() as T;
        }
        catch {
            options.signal?.throwIfAborted();
            if (!retryable || attempt >= 1)
                throw new Error(message);
        }
        finally {
            clearTimeout(timeout);
        }
        await new Promise(resolve => setTimeout(resolve, options.retryDelayMs ?? 800));
    }
}
