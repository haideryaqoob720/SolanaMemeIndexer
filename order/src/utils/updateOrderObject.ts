import type { sniperOrderRedis } from "../../redis/cache.type";
import type { Strategy } from "../types";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function updateOrderObject(
    sniper: Strategy,
    mint: string,
    decimals: number,
    fees: number,
    priceInSol: number,
    solPrice: number,
    amountInLamports: number,
    quote: any,
    buyTxHash: string | null,
) {
    const order: sniperOrderRedis = {
        buyTime: Date.now(),
        mint: mint,
        strategyId: sniper.id,
        userId: sniper.userId,
        decimals: decimals,
        dex: "PumpSwap",
        route: "Native",
        txFees: fees / LAMPORTS_PER_SOL,
        keypair: {
            public: sniper.user.user_wallets.public_key,
            private: sniper.user.user_wallets.private_key,
        },
        isOnChain: sniper.isOnChain,
        orderAmountInUsd: sniper.orderAmountInSol, //is usd name will be changed
        buyingPrice: priceInSol * solPrice,
        initialPrice: {
            sol: {
                actual: priceInSol,
                estimated: null,
            },
            usd: {
                actual: priceInSol * solPrice,
                estimated: null,
            },
        },
        finalPrice: {
            sol: {
                actual: null,
                estimated: null,
            },
            usd: {
                actual: null,
                estimated: null,
            },
        },
        buyAmount: {
            sol: {
                estimated: amountInLamports / LAMPORTS_PER_SOL,
                actual: amountInLamports / LAMPORTS_PER_SOL,
            },
            usd: {
                estimated: sniper.orderAmountInSol,
                actual: sniper.orderAmountInSol,
            },
        },
        sellAmount: {
            sol: {
                estimated: null,
                actual: null,
            },
            usd: {
                estimated: null,
                actual: null,
            },
        },
        //in usd
        takeProfitPrice: sniper.profit * priceInSol * solPrice,
        sellTime: null,
        status: "pending",
        //in usd
        stopLossPrice: sniper.stopLoss * priceInSol * solPrice,
        tokenBuyAmount: {
            // actual: parseInt(quote.amountOut.toString()),
            actual: quote.amountOut,
            estimated: null,
        },
        tokenSellAmount: {
            actual: null,
            estimated: null,
        },
        //   buyTxHash:buyRes.tx,
        buyTxHash: buyTxHash,
        sellTxHash: null,
    };
    return order;
}
