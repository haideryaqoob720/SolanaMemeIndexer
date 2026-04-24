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

export interface realTimeTokenMetrics {
    liquiditySol: number;
    liquidityUsd: number;
    priceSol: number;
    priceUsd: number;
    reserveSol: number;
    reserveToken: number;
}

export interface pumpSwapCreateDecode {
    mint: string;
    creator: string;
    market: string;
    quoteVault: string;
    baseVault: string;
    isQuoteSol: boolean;
    reserveSol: string;
    reserveToken: string;
    liquidityInSol: number;
    liquidityInUsd: number;
    priceInSol: number;
    priceInUsd: number;
    lpTokenBurn: string;
    decimals: number;
}

export interface pumpSwapSwapDecode {
    mint: string;
    isBuy: boolean;
    holder: string;
    solInTx: number;
    tokenInTx: number;
    solReserve: number;
    tokenReserve: number;
    priceInSol: number;
    priceInUsd: number;
    liquidityInSol: number;
    liquidityInUsd: number;
    timestamp: number;
    txTokenBn: any;
    txsolBn: any;
    signature?: string;
}

export interface pumpSwapWithdrawDecode {
    mint: string;
    holder: string;
    solInTx: number;
    tokenInTx: number;
    solReserve: number;
    tokenReserve: number;
    priceInSol: number;
    priceInUsd: number;
    liquidityInSol: number;
    liquidityInUsd: number;
    timestamp: number;
    txTokenBn?: any;
    signature?: string;
}
export interface dexPool {
    mint: string;
    poolAddress: string;
    dex: string;
    priceInSol: number;
    priceInUsd: number;
    solReserves: string;
    tokenReserves: string;
    liquidityInSol: number;
    liquidityInUsd: number;
    totalTx: number;
    buyTx: number;
    sellTx: number;
}
