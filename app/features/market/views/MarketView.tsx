"use client";
import { StockWorkspace } from "../../../shell/featureLoaders";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
type Props = {
    controller: Pick<WorkspaceController, "view" | "market" | "marketLoading" | "marketError" | "refreshStocks" | "setToast">;
};
export function MarketView({ controller }: Props) {
    const { view, market, marketLoading, marketError, refreshStocks, setToast } = controller;
    return <>{view === "股票" && (<StockWorkspace market={market} loading={marketLoading} error={marketError} onRefresh={refreshStocks} onNotify={setToast}/>)}</>;
}
