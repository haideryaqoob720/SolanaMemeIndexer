import axios from "axios";
import getOrdersStore, { OrderStore } from "../../redis/sniperOrders";
import { SniperStrategyStore } from "../../redis/sniperStrategies";
import { RedisCache } from "../../redis/store";
import { sniperOrderTest } from "../../redis/types";
import { logWithdraw } from "../../utils/withdrawLogger";
import { OrderMetricsStore } from "../../redis/sniperOrderMetrics";
import { eventLogger } from "../../utils/withdrawLogger";

async function updateOneOrder(
    order: sniperOrderTest,
    priceInUsd: number,
    solPrice: number,
    market: string,
    isQuoteSol: boolean,
    sniperStrategiesCache: SniperStrategyStore,
    orderMetricsCache: OrderMetricsStore,
) {
    if (order.status !== "pending") {
        return;
    }
    const orderId: string = `${order.userId}:${order.strategyId}`;
    order.status = "loss";
    console.log(`selling ${orderId}:${order.mint} on withdraw event`);
    console.log("selling withdraw", {
        mint: order.mint,
        priceInUsd: priceInUsd,
        solPrice: solPrice,
        market: market,
    });
    logWithdraw("selling withdraw", {
        mint: order.mint,
        priceInUsd: priceInUsd,
        solPrice: solPrice,
        market: market,
    });
    const strategy = await sniperStrategiesCache.getStrategy(
        order.strategyId.toString(),
    );
    const orderMetrics = await orderMetricsCache.getActiveMetrics(
        order.userId,
        order.strategyId,
        order.mint,
    );
    const res = await axios.post("http://localhost:6000/api/sell", {
        sniper: strategy,
        order: order,
        orderMetrics: orderMetrics,
        dex: "PumpSwap",
        mint: order.mint,
        decimals: order.decimals,
        solPrice: solPrice,
        market: market,
        priceInSol: priceInUsd / solPrice,
        isQuoteSol: isQuoteSol,
        isWithdraw: true,
    });
    console.log(res.data, "pumpswap withdraw");
}

async function updateAllOrders(
    priceInSol: number,
    mint: string,
    priceInUsd: number,
    solPrice: number,
    market: string,
    sniperStrategiesCache: SniperStrategyStore,
    orderMetricsCache: OrderMetricsStore,
    orderCache: OrderStore,
    isQuoteSol: boolean,
) {
    const sniperOrder = await orderCache.readOrdersForMint(mint);
    if (!sniperOrder) {
        console.log("withdraw event: token was not bought, ", mint);
        logWithdraw(`withdraw event: token was not bought ${mint} `);
        return;
    }
    await Promise.all(
        sniperOrder.map(async (order, index) => {
            await updateOneOrder(
                order,
                priceInUsd,
                solPrice,
                market,
                isQuoteSol,
                sniperStrategiesCache,
                orderMetricsCache,
            );
        }),
    );
}

export default updateAllOrders;
