import getOrdersStore from "../redis/order";
import { addSniperOrder } from "./db/addOrder";
import { postSnipersToPumpSwap } from "./processPumpSwapOrder";
import axios from "axios";
import type { Strategy } from "./types";
import getSniperOrdersStore from "../redis/sniperOrders";
import orderLogger from "./orderLogger";
import { getActiveOrdersStore } from "../redis/activeOrders";
import { getOrderVolumeStore } from "../redis/orderVolume";
import {
    getOrderMetricsStore,
    type sniperOrderMetrics,
} from "../redis/orderMetrics";

export async function placeStrategyOrder(
    dex: "Raydium" | "PumpSwap",
    sniper: Strategy,
    mint: string,
    decimals: number,
    solPrice: number,
    market: string,
    priceInSol: number,
    isQuoteSol: boolean,
    orderMetrics: sniperOrderMetrics,
) {
    // const cache = await getOrdersStore();
    const cache = await getSniperOrdersStore();
    const activeOrders = await getActiveOrdersStore();
    const orderVolumeCache = await getOrderVolumeStore();
    const orderMetricsCache = await getOrderMetricsStore();
    switch (dex) {
        case "PumpSwap":
            // const existingOrders = await cache.readOrdersForMint(mint);
            // if (existingOrders && existingOrders.length > 0) {
            //     snipers = snipers.filter((sniper) => {
            //         return !existingOrders.some(
            //             (order) =>
            //                 order.userId === sniper.userId &&
            //                 order.strategyId === sniper.id &&
            //                 order.mint === mint,
            //         );
            //     });
            // }
            // if (snipers)
            //     if (snipers.length === 0) {
            //         return;
            //     }
            const alreadyProcessed = await activeOrders.getActiveOrder(
                mint,
                sniper.userId,
                sniper.id,
            );
            const hasOrder = await cache.readOneOrder(
                mint,
                sniper.userId,
                sniper.id,
            );
            if (hasOrder || alreadyProcessed) {
                await cache.removeSniperProcessLock(
                    mint,
                    `${sniper.userId}:${sniper.id}`,
                );
                orderLogger.info(
                    `order already exists ${sniper.userId}:${sniper.id}:${mint}`,
                );
                // await orderVolumeCache.updatePendingOrderVolume(
                //     sniper.userId,
                //     sniper.id,
                //     sniper.orderAmountInSol,
                //     false,
                // );
                await orderVolumeCache.canPlaceAndUpdateOrder(
                    `${sniper.userId}:${sniper.id}`,
                    0,
                    sniper.orderAmountInSol,
                    false,
                );
                return;
            }
            await activeOrders.addActiveOrder(mint, sniper.userId, sniper.id);
            const newOrder = await postSnipersToPumpSwap(
                sniper,
                mint,
                decimals,
                solPrice,
                cache,
                market,
                priceInSol,
                isQuoteSol,
            );
            if (!newOrder) {
                await cache.removeSniperProcessLock(
                    mint,
                    `${sniper.userId}:${sniper.id}`,
                );
                orderLogger.info(
                    `removed processLock ${sniper.userId}:${sniper.id}:${mint}`,
                );
                await orderVolumeCache.canPlaceAndUpdateOrder(
                    `${sniper.userId}:${sniper.id}`,
                    0,
                    sniper.orderAmountInSol,
                    false,
                );
                return;
            }
            orderMetrics.buy.completed = new Date().toISOString();
            const newOrderDb = await addSniperOrder(newOrder);
            await cache.removeSniperProcessLock(
                mint,
                `${sniper.userId}:${sniper.id}`,
            );
            console.log(newOrderDb, "buy order");
            orderMetrics.buy.dbUpdated = new Date().toISOString();
            await orderMetricsCache.updateActiveMetrics(
                newOrder.userId,
                newOrder.strategyId,
                newOrder.mint,
                orderMetrics,
            );
            try {
                // try{
                //     //Order is processed and stored to DB.
                //     //Updating it's pendingVolume.
                //     await orderVolumeCache.updatePendingOrderVolume(
                //         newOrder.userId,
                //         newOrder.strategyId,
                //         newOrder.orderAmountInUsd,
                //         true
                //     );
                //     console.log("Pending Volume is increased on buy");
                // }catch(err:any){
                //     console.log(err.message);
                // }
                await axios.post(
                    "https://websocket.lamboradar.com:5000/order-analytics",
                    {
                        orderId: newOrderDb.id,
                        mint: newOrderDb.mint,
                        isBuy: true,
                    },
                );
            } catch (error: any) {
                console.log("error sending buy order analytics", error.message);
            }
            // if (newOrders) {
            //     await Promise.all(
            //         newOrders.map(async (order) => {
            //             await addSniperOrder(order);
            //         }),
            //     );
            // }
            break;
        case "Raydium":
            break;
        default:
            console.log("invalid dex");
            break;
    }
}
