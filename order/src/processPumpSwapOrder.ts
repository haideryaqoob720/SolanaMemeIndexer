import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { sniperOrderRedis } from "../redis/cache.type";
import type { OrderStore } from "../redis/order";
import { updateOrderObject } from "./utils/updateOrderObject";
import type { Strategy } from "./types";
import { pumpSwapQuote, sendBuyTxPumpSwap } from "./pumpswap/pumpSwapBuySell";
import { RateLimiter } from "limiter";
import { BN } from "@coral-xyz/anchor";
import getSniperOrdersStore, { SniperOrderStore } from "../redis/sniperOrders";
import { getLatestPrice } from "./utils/onChain";

const limiter = new RateLimiter({ tokensPerInterval: 10, interval: "second" });
async function fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await limiter.removeTokens(1);
    return await fn();
}

export async function postSnipersToPumpSwap(
    sniper: Strategy,
    mint: string,
    dec: string | number,
    solPrice: number,
    cache: SniperOrderStore,
    market: string,
    priceInSol: number,
    isQuoteSol: boolean,
): Promise<sniperOrderRedis | null> {
    let decimals: number = 6;
    try {
        if (typeof dec === "string") {
            decimals = parseInt(dec[1] ?? "6") ?? 6;
        } else {
            decimals = dec;
        }
    } catch (err: any) {
        console.log("error getting decimals");
    }
    let fees = 100000;
    // let newOrder: sniperOrder | null = null;
    // await Promise.all(
    //     snipers.map(async (sniper: any) => {
    //amount in usd change in db later
    // await cache.addActiveOrder(mint, sniper.userId, sniper.id);
    const amountInLamports = Math.floor(
        (sniper.orderAmountInSol / solPrice) * LAMPORTS_PER_SOL,
    );
    console.log(market, amountInLamports, true);
    let quote: {
        amountOut: any;
    } = {
        amountOut: 0,
    };
    if (sniper.isOnChain) {
        quote = await fetchWithRateLimit(async () => {
            const quote = await pumpSwapQuote(market, amountInLamports, true);
            return quote;
        });
        const latestPrice = await getLatestPrice(market, decimals);
        if (latestPrice) {
            priceInSol = latestPrice;
        }
    } else {
        const orderInSol = sniper.orderAmountInSol / solPrice;
        quote = {
            amountOut: orderInSol / priceInSol, //token ui amount
        };
        // if (sniper.id === 53) {
        //     const latestPrice = await getLatestPrice(market, decimals);
        //     if (latestPrice) {
        //         priceInSol = latestPrice;
        //     }
        // }
    }

    // const quote = {
    //     amountOut: amountInLamports / priceInSol,
    // };
    try {
        console.log({
            sniperProfit: sniper.profit,
            sniperLoss: sniper.stopLoss,
            orderAmount: sniper.orderAmountInSol,
            pumpSwapQuote: quote,
        });
        if (!quote) {
            console.log("no quote", quote);
            return null;
        }
        if (priceInSol < 0 || priceInSol === 0) {
            console.log(
                "error getting latest price from, skipping token",
                mint,
                priceInSol,
            );
            return null;
        }
        if (!sniper.profit || !sniper.stopLoss) {
            console.log("no profit loss", sniper.profit, sniper.stopLoss);
            return null;
        }
        // const buyRes:
        // const buyRes = await pumpBuyTx(mint, sniper.user.user_wallets.public_key, sniper.user.user_wallets.private_key, bloxQuote.inAmount, sniper.isOnChain ?? false)
        const buyRes = await sendBuyTxPumpSwap(
            market,
            sniper.isOnChain, //need to change
            // false,
            amountInLamports,
            sniper.user.user_wallets.public_key,
            // "6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z",
            sniper.user.user_wallets.private_key,
            // "41z1T6UudJdyF7wjgRTJzRRff2wJGBtrxYojf2GZSrAaKEL8zrF78jd3XtBEZ7rCGLWRDDo4VLSdvhtAjFiP1atY",
            priceInSol * solPrice,
            isQuoteSol,
        );
        if (!buyRes) {
            return null;
        }
        // if (sniper.isOnChain && !buyRes.tx) {
        //     // const oneWallet: boolean = isQuoteSol ? sniper.isOnChain : false;
        //     // if (!buyRes.tx) {
        //     return null;
        // }
        const order: sniperOrderRedis = updateOrderObject(
            sniper,
            mint,
            decimals,
            fees,
            priceInSol,
            solPrice,
            amountInLamports,
            quote,
            buyRes.tx,
        );
        console.log({
            mint: order.mint,
            tokenPrice: priceInSol,
            tokenBuyAmount: order.tokenBuyAmount.actual,
            usd: sniper.orderAmountInSol,
            time: Date().toString(),
        });
        // await cache.addOrder(order);
        // const newOrdersCache = await getSniperOrdersStore();
        await cache.addOrder(order);
        await cache.removeSniperProcessLock(
            order.mint,
            `${order.userId}:${order.strategyId}`,
        );
        return order;
        // newOrders.push(order);
    } catch (error: any) {
        console.log("error creating order in Redis", error.message);
        return null;
    }
    //     }),
    // );
    // return newOrders;
}
