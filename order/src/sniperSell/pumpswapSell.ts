import { BN } from "@coral-xyz/anchor";
// import { updateSniperOrder } from "../db/updateSniperOrder/updateSniperOrder";
import { updateOrder } from "../db/updateOrder";
import { sendSellTransaction } from "../onChain/sell/sell";
// import { pumpSwapStore } from "../redis/pumpswap";
// import { RedisCache } from "../redis/store";
import { pumpSwapQuote } from "./sellUtils";
import type { sniperOrderRedis } from "../../redis/cache.type";
import axios from "axios";
import getOrdersStore from "../../redis/order";
import getSniperOrdersStore from "../../redis/sniperOrders";
import { logError } from "../errorLogger";
import { calculateSolReceived, multiplyPrecise } from "../utils/calculateSol";
import { getOrderVolumeStore } from "../../redis/orderVolume";
import orderLogger from "../orderLogger";
import {
    getOrderMetricsStore,
    type sniperOrderMetrics,
} from "../../redis/orderMetrics";
import { getLatestPrice } from "../utils/onChain";
import { closeAccount } from "./closeAccount";

const correctSellAmount = (
    sellAmount: number,
    orderAmountInUsd: number,
    status: string,
): number => {
    if (sellAmount > orderAmountInUsd * 2) {
        return orderAmountInUsd * 2;
    } else if (sellAmount < orderAmountInUsd - orderAmountInUsd * 2) {
        return orderAmountInUsd - orderAmountInUsd / 2;
    }
    return sellAmount;
};

export async function pumpSwapSell(
    mint: string,
    priceInSol: number,
    priceInUsd: number,
    solPrice: number,
    order: sniperOrderRedis,
    market: string,
    isQuoteSol: boolean,
    isWithdraw: boolean,
    orderMetrics: sniperOrderMetrics,
) {
    let retries = 0;
    // const orderCache = await getOrdersStore();
    const sniperOrderCache = await getSniperOrdersStore();
    const orderVolumeCache = await getOrderVolumeStore();
    const orderMetricsCache = await getOrderMetricsStore();
    // const existingPump = await cache.getToken(mint)
    // if(!existingPump){
    //     console.log("pumpswap token not found")
    //     return
    // }
    // let orders:any
    // const orders = await tokenMap.readTestSniperOrder(mint)
    // const solPrice = await tokenMap.getSolPrice()
    // if(!orders){
    //     console.log(`no orders found for ${mint}`)
    //     return
    // }
    // await Promise.all(
    //     orders.map(async(order, index) => {
    let retry = true;
    let retryCount = 0;
    const MAX_RETRIES = 3; // Define a maximum number of retries

    while (retry && retryCount < MAX_RETRIES) {
        retryCount++;
        // console.log("in sniper sell", mint, orders.length, `retry attempt: ${retryCount}`);

        if (!order.tokenBuyAmount.actual) {
            console.log(`no token buy amount for ${mint} should skip`);
            retry = false; // Exit the loop if there's no token buy amount
            return;
        }
        let quote: any;
        try {
            if (order.isOnChain) {
                quote = await pumpSwapQuote(
                    market,
                    order.tokenBuyAmount.actual * Math.pow(10, order.decimals),
                    false,
                    isQuoteSol,
                );
            }
            console.log(
                {
                    mint: order.mint,
                    // sdkQuote: quote.amountOut,
                    tokenPrice: priceInSol,
                    tokenAmountToSell: order.tokenBuyAmount.actual,
                    solRecieved: calculateSolReceived(
                        order.tokenBuyAmount.actual,
                        priceInSol,
                    ),
                    time: Date().toString(),
                },
                "sell",
            );
            quote = {
                // amountOut: order.tokenBuyAmount.actual * priceInSol,
                amountOut: calculateSolReceived(
                    order.tokenBuyAmount.actual,
                    priceInSol,
                ),
            };
            // quote = await blox.getQuoteApi(
            //     order.mint,
            //     order.decimals,
            //     order.tokenBuyAmount.actual ?? order.tokenBuyAmount.estimated ?? 100000000,
            //     false
            // );
        } catch (error: any) {
            console.log(`error getting quote for ${mint}`, error.message);
            // Decide whether to retry based on the error
            if (
                error.message.includes("temporary") ||
                error.message.includes("timeout")
            ) {
                console.log("Retryable error, continuing...");
                continue;
            } else {
                console.log("Non-retryable error, stopping retry loop");
                retry = false;
                // continue;
            }
        }

        if (!quote) {
            console.log(`no quote found for ${mint}`, quote);
            retry = false; // Exit the loop if no quote is found
            // continue;
            return;
        }

        if (order.buyingPrice === null) {
            console.log(`No buying price for ${mint}, skipping`);
            retry = false; // Exit the loop if there's no buying price
            // continue;
        }
        orderLogger.debug("sending sell tx");
        const sellRes = await sendSellTransaction(
            order.mint,
            market,
            order.keypair.public,
            order.keypair.private,
            // quote.inAmount,
            order.tokenBuyAmount.actual ??
                order.tokenBuyAmount.estimated ??
                100000000,
            order.decimals,
            order.isOnChain,
            order.buyTxHash ? true : false,
            "PumpSwap",
            priceInSol,
            isQuoteSol,
            isWithdraw,
            retryCount,
        );
        // console.log(sellRes, "sellres");
        if (!sellRes) {
            console.log(`Sell transaction failed for ${mint}`);
            // Maybe retry for certain failure reasons
            // continue;
            return null;
        }
        if (order.isOnChain && !sellRes.tx && order.buyTxHash && !isWithdraw) {
            console.log(sellRes, "isonChain no tx");
            return null;
        }
        let latestPriceSol: number | null = 0;
        if (order.isOnChain || order.strategyId === 53) {
            latestPriceSol = await getLatestPrice(market, order.decimals);
        }
        // Update order with successful transaction data
        order.finalPrice.sol.estimated =
            order.isOnChain && latestPriceSol ? latestPriceSol : priceInSol;
        order.finalPrice.usd.estimated =
            order.isOnChain && latestPriceSol
                ? latestPriceSol * solPrice
                : priceInUsd;
        order.finalPrice.sol.actual =
            order.isOnChain && latestPriceSol ? latestPriceSol : sellRes.price;
        order.finalPrice.usd.actual =
            order.isOnChain && latestPriceSol
                ? latestPriceSol * solPrice
                : sellRes.price * solPrice;
        // order.sellAmount.sol.estimated = parseFloat(quote.amountOut);
        order.sellAmount.sol.estimated = quote.amountOut;
        // order.sellAmount.usd.estimated = parseFloat(quote.amountOut) * solPrice;
        order.sellAmount.usd.estimated = multiplyPrecise(
            quote.amountOut,
            solPrice,
            {
                decimalPlaces: 8,
            },
        );
        // order.sellAmount.sol.actual = sellRes.outAmount
        // order.sellAmount.usd.actual = sellRes.outAmount * solPrice
        order.sellTime = Date.now();
        // console.log(
        //     {
        //         solBuyAmount: order.buyAmount.sol.actual,
        //         solSellAmount: sellRes.outAmount,
        //         usdBuy: order.buyAmount.usd.actual,
        //         usdSell: sellRes.outAmount * solPrice,
        //     },
        //     "sell amounts",
        // );
        // sellLogger.info({
        //     solBuyAmount: order.buyAmount.sol.actual,
        //     solSellAmount: sellRes.outAmount,
        //     usdBuy: order.buyAmount.usd.actual,
        //     usdSell: sellRes.outAmount * solPrice,
        // })
        order.tokenSellAmount.estimated =
            order.tokenBuyAmount.actual ??
            order.tokenBuyAmount.estimated ??
            100000000;
        order.sellAmount = {
            sol: {
                // estimated: parseFloat(quote.amountOut.toNumber()),
                estimated: quote.amountOut,
                actual: correctSellAmount(
                    sellRes.outAmount * solPrice,
                    order.orderAmountInUsd,
                    order.status,
                ),
            },
            usd: {
                // estimated: quote.amountOut.toNumber() * solPrice,
                // estimated: quote.amountOut * solPrice,
                estimated: multiplyPrecise(quote.amountOut, solPrice, {
                    decimalPlaces: 8,
                }),
                // actual: sellRes.outAmount * solPrice,
                actual: multiplyPrecise(sellRes.outAmount, solPrice, {
                    decimalPlaces: 8,
                }),
            },
        };
        order.sellTxHash = sellRes.tx;

        if (
            order.sellTxHash ||
            (order.isOnChain && order.buyTxHash && isWithdraw)
        ) {
            await closeAccount(order);
        }

        // if(order.initialPrice.sol.actual) {
        if (order.buyAmount.sol.estimated) {
            // sellLogger.info("status", {buyAmount:order.buyAmount.sol.actual}, {sellAmount:sellRes.outAmount})
            order.status =
                order.buyAmount.sol.estimated <
                (order.sellAmount.sol.estimated ?? quote.amountOut)
                    ? "profit"
                    : "loss";
        }
        order.status = isWithdraw ? "withdraw" : order.status;
        const initialPriceUsd = order.initialPrice.usd.actual;
        const sellingUsd = order.sellAmount.usd.actual;
        if (initialPriceUsd && sellingUsd) {
            const profitMultiplier = order.takeProfitPrice / initialPriceUsd;
            const currentProfit = sellingUsd / order.orderAmountInUsd + 1;
            const errorMargin = currentProfit / profitMultiplier;
            if (errorMargin >= 2) {
                order.sellAmount.usd.actual = 0;
            }
        }
        // console.log(order);
        // await tokenMap.deleteTestSniperOrder(mint, order.userId, order.strategyId);
        // await tokenMap.addTestSniperOrder(order);
        // await orderCache.addOrder(order)
        orderMetrics
            ? (orderMetrics.sell.completed = new Date().toISOString())
            : null;
        const updatedOrder = await updateOrder(order);

        try {
            await axios.post(
                "https://websocket.lamboradar.com:5000/order-analytics",
                {
                    orderId: updatedOrder?.id,
                    mint: updatedOrder?.mint,
                    isBuy: false,
                },
            );
        } catch (error: any) {
            console.log("error send order analytics", error.message);
        }
        if (!updatedOrder) {
            console.log("could not update sniper order in db when selling");
            logError("could not update sniper order in db when selling", order);
            // errorLoggerWithRotation.log(
            //     "error",
            //     "could not update sniper order in db when selling",
            // );
            return;
        }
        if (!updatedOrder.sellTime || updatedOrder.status === "pending") {
            console.log(updatedOrder, "pending after processing");
        }
        // await sniperOrderCache.removeSniperProcessLock(
        //     order.mint,
        //     `${order.userId}:${order.strategyId}`,
        // );
        orderMetrics
            ? (orderMetrics.sell.dbUpdated = new Date().toISOString())
            : null; // console.log(updatedOrder, "order sell");
        await sniperOrderCache.deleteOrder(
            mint,
            order.userId,
            order.strategyId,
        );
        await orderMetricsCache.updateActiveMetrics(
            order.userId,
            order.strategyId,
            mint,
            orderMetrics,
        );
        // if (order.buyAmount.usd.actual) {
        // await orderVolumeCache.updatePendingOrderVolume(
        //     order.userId,
        //     order.strategyId,
        //     order.orderAmountInUsd,
        //     false,
        // );
        await orderVolumeCache.canPlaceAndUpdateOrder(
            `${order.userId}:${order.strategyId}`,
            0,
            order.orderAmountInUsd,
            false,
        );
        // }
        // await orderCache.deleteOrder(order.mint, order.userId, order.strategyId);
        console.log(`${mint} sold \n https://solscan.io/tx/${sellRes.tx}`);

        // const tokenBalance = await getTokenAmount(order.mint, order.keypair.public);

        // Clear check for exiting retry loop
        // if(!tokenBalance && sellRes.tx) {
        //     console.log("Transaction successful and no remaining balance, exiting retry loop");
        //     retry = false;
        // } else if (tokenBalance) {
        //     console.log(`Still have token balance of ${tokenBalance}, will retry`);
        //     // Maybe add a delay before retry
        //     await new Promise(resolve => setTimeout(resolve, 1000));
        // } else {
        //     retry=false // for testing, remove later
        //     console.log("Transaction unsuccessful, will retry");
        // }
    }

    if (retryCount >= MAX_RETRIES) {
        console.log(
            `Maximum retry attempts (${MAX_RETRIES}) reached for ${mint}`,
        );
    }
    // })
    // );
}
