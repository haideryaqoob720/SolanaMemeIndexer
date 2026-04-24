import { raydium_tokens, tokens } from "@prisma/client";

export interface trendingMetrics {
    liquidityUsd: number;
    priceUsd?: number;
    marketcapUsd?: number;
    transactions?: number;
    solVolume?: number;
}

export interface trendingTokens {
    token: tokens;
    raydium: raydium_tokens;
}

/*
  actual is the amount that is set by the quote api or after the transaction has been processed
  estimated is the amount that is decoded and processed using the stream
*/
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

export interface sniperOrderTest {
    mint: string;
    userId: number;
    strategyId: number;
    decimals: number;
    dex: "Raydium" | "PumpSwap";
    keypair: userWallet;
    isOnChain: boolean;
    orderAmountInUsd: number;
    buyingPrice: number;
    takeProfitPrice: number;
    stopLossPrice: number;
    status: string;
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
// interface timeTaken {
//     timeMs: number;
//     timestamp: string;
// }

// interface orderTxMetrics {
//     eventTriggered: timeTaken | null;
//     addedToQ: timeTaken | null;
//     startedProcessing: timeTaken | null;
//     completed: timeTaken | null;
//     dbUpdated: timeTaken | null;
// }

// export interface sniperOrderMetrics {
//     buy: orderTxMetrics;
//     sell: orderTxMetrics;
//     isOnChain: boolean;
// }
