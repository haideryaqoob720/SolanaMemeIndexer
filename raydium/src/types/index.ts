import { PublicKey, TokenAccountBalancePair } from "@solana/web3.js";

export interface TokenMetrics {
    mint: string;
    uri?: string | null;
    name?: string | null;
    symbol?: string | null;
    socials?: string[] | null;
    //   topHolders: TokenAccountBalancePair[];
    top10holderEquity?: number | null;
    creatorEquity?: number | null;
    //   marketCap?: number | null;
    totalSupply?: number | null;
    lpBurned?: boolean | null;
    lpBurnedAmount?: number | null;
    reserve?: {
        sol?: number | null;
        token?: number | null;
    } | null;
    mintable?: boolean | null;
    freezeable?: boolean | null;
    tax?: boolean | null;
    taxAmount?: number | null;
    liquidityLock?: boolean | null;
}

export interface tokenHolder {
    user: string;
    balance: number;
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
    sol: comparePrices | null;
    usd: comparePrices | null;
}
interface userWallet {
    public: string;
    private: string;
}

export interface sniperOrder {
    mint: string;
    userId: number;
    decimals: number;
    dex: "Raydium" | "PumpSwap";
    route: "BloxRoute" | "Jupiter" | "Native" | null;
    strategyId: number;
    keypair: userWallet;
    orderAmountInUsd: number;
    txFees: number;
    //prices in usd, sol price fluctuates
    buyingPrice: number | null;
    takeProfitPrice: number | null;
    stopLossPrice: number | null;
    isOnChain: boolean;
    // till here
    status: string;
    initialPrice: prices;
    finalPrice: prices;
    tokenBuyAmount: comparePrices;
    tokenSellAmount: comparePrices;
    buyAmount: prices;
    sellAmount: prices;
    buyTime: number;
    sellTime: number | null;
    buyTxHash: string | null;
    sellTxHash: string | null;
}

export interface sniperRoutesStats {
    dex: "Raydium" | "Pumpswap";
    route: "BloxRoute" | "Jupiter" | "Native";
    price: number;
    buyRequestTime: number | null;
    buyResponseTime: number | null;
    sellRequestTime: number | null;
    sellResponseTime: number | null;
}
