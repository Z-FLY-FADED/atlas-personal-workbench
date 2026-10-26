"use client";
import { useEffect } from "react";
import type { MarketPayload } from "../../../contracts/workspace";
import { readResearchJson } from "../../../shared/api/researchClient";
import type { WorkspaceState } from "../../../shell/useWorkspaceState";
type Dependencies = Pick<WorkspaceState, "view" | "market" | "setMarketLoading" | "setMarketError" | "setMarket" | "marketLoading" | "setToast">;
export function useMarketWorkspace(dependencies: Dependencies) {
    const { view, market, setMarketLoading, setMarketError, setMarket, marketLoading, setToast } = dependencies;
    useEffect(() => {
        const reset = () => setMarket(null);
        window.addEventListener('atlas-runtime-policy', reset);
        return () => window.removeEventListener('atlas-runtime-policy', reset);
    }, [setMarket]);
    useEffect(() => {
        if (view !== "股票" || market)
            return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setMarketLoading(true);
            setMarketError('');
            void readResearchJson<MarketPayload>('/api/market', '行情加载失败，请检查连接后重试', { signal: controller.signal })
                .then(data => {
                if (!controller.signal.aborted)
                    setMarket(data);
            })
                .catch(error => {
                if (!controller.signal.aborted)
                    setMarketError(error.message);
            })
                .finally(() => {
                if (!controller.signal.aborted)
                    setMarketLoading(false);
            });
        }, 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [view, market, setMarketLoading, setMarketError, setMarket]);
    async function refreshStocks() {
        if (marketLoading)
            return;
        setMarketLoading(true);
        setMarketError('');
        try {
            const data = await readResearchJson<MarketPayload>(`/api/market?refresh=${Date.now()}`, '行情加载失败，请检查连接后重试');
            setMarket(data);
            const instruments = data.instruments || Object.values(data.markets || {}).flat();
            const verified = instruments.filter((item) => item.verified).length;
            setToast(data.availability?.state === 'offline' || data.availability?.state === 'unavailable' ? data.availability.message : `已刷新 ${instruments.length} 个标的，${verified} 个通过多源核验`);
        }
        catch {
            setMarketError('行情加载失败，请检查连接后重试');
            setToast("行情刷新失败，请稍后重试");
        }
        finally {
            setMarketLoading(false);
        }
    }
    return { refreshStocks };
}
export type MarketWorkspaceResult = ReturnType<typeof useMarketWorkspace>;
