"use client";
import { useState } from "react";
import type { MarketPayload } from "../../../contracts/workspace";
export function useMarketState() {
    const [market, setMarket] = useState<MarketPayload | null>(null);
    const [marketLoading, setMarketLoading] = useState(true);
    const [marketError, setMarketError] = useState('');
    return { market, setMarket, marketLoading, setMarketLoading, marketError, setMarketError };
}
