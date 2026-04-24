interface comparePrices {
    estimated: number | null;
    actual: number | null;
}
interface prices {
    sol: comparePrices;
    usd: comparePrices;
}

interface userWallet {
    public: string;
    private: string;
}

export interface sniperOrderRedis {
    mint: string;
    userId: number;
    strategyId: number;
    decimals: number;
    dex: "Raydium" | "PumpSwap" | string;
    route: "BloxRoute" | "Jupiter" | "Native" | null | string;
    txFees: number;
    keypair: userWallet;
    isOnChain: boolean;
    orderAmountInUsd: number;
    buyingPrice: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    status: "profit" | "pending" | "loss" | "withdrawn" | string;
    initialPrice: prices;
    finalPrice: prices;
    tokenBuyAmount: comparePrices;
    buyAmount: prices;
    sellAmount: prices;
    tokenSellAmount: comparePrices;
    buyTime: number;
    sellTime: number | null;
    buyTxHash: string | null;
    sellTxHash: string | null;
}

// interface orderTxMetrics {
//     eventTriggered: string | null;
//     addedToQ: string | null;
//     startedProcessing: string | null;
//     completed: string | null;
//     dbUpdated: string | null;
// }

// export interface sniperOrderMetrics {
//     buy: orderTxMetrics;
//     sell: orderTxMetrics;
//     isOnChain: boolean;
// }
