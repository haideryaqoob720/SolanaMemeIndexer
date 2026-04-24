import type { sniperOrderRedis } from "../redis/cache.type";
import type { sniperOrderMetrics } from "../redis/orderMetrics";

export interface UserWallet {
    id: number;
    public_key: string;
    private_key: string;
    email: string;
    created_at: string;
}

export interface User {
    id: number;
    email: string;
    password: string;
    role: string;
    created_at: string;
    updated_at: string;
    user_wallets: UserWallet;
}

export interface Strategy {
    id: number;
    name: string;
    userId: number;
    mintable: boolean;
    freezeable: boolean;
    liquidityAmount: number;
    top10HoldingPercentage: number;
    bundlePercentage: number;
    orderAmountInSol: number;
    profit: number;
    stopLoss: number;
    active: boolean;
    market_cap: number;
    volume: number;
    total_tx: number;
    totalHolders: number;
    isOnChain: boolean;
    createdAt: string;
    updatedAt: string;
    user: User;
}

export interface OrderRequest {
    dex: "Raydium" | "PumpSwap";
    sniper: Strategy;
    orderMetrics: sniperOrderMetrics;
    mint: string;
    decimals: number;
    isQuoteSol: boolean;
    solPrice: number;
    market: string;
    priceInSol: number;
    orderType: "buy" | "sell";
}

export interface OrderSellRequest {
    dex: "Raydium" | "PumpSwap";
    sniper: Strategy;
    order: sniperOrderRedis;
    orderMetrics: sniperOrderMetrics | null;
    mint: string;
    decimals: number;
    solPrice: number;
    market: string;
    priceInSol: number;
    orderType: "buy" | "sell";
}
