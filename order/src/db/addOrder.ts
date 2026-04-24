import { prisma } from "../../prisma/client";
import type { sniperOrderRedis } from "../../redis/cache.type";
import orderLogger from "../orderLogger";

export async function addSniperOrder(
    order: sniperOrderRedis,
): Promise<any | null> {
    try {
        /*
        using sniperOrdersTemp for stress testing revert back to sniperOrders after testing
      */
        const newOrder = await prisma.sniperOrders.create({
            data: {
                mint: order.mint,
                rayMint: order.mint,
                userId: order.userId,
                strategyId: order.strategyId,
                decimals: order.decimals,
                orderAmountInUsd: order.orderAmountInUsd,
                buyingPrice: order.buyingPrice,
                takeProfitPrice: order.takeProfitPrice,
                stopLossPrice: order.stopLossPrice,
                status: order.status,
                dex: order.dex,
                txFees: order.txFees,
                initialPrice: {
                    sol: {
                        estimated: order.initialPrice.sol?.estimated || null,
                        actual: order.initialPrice.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.initialPrice.usd?.estimated || null,
                        actual: order.initialPrice.usd?.actual || null,
                    },
                },
                finalPrice: {
                    sol: {
                        estimated: order.finalPrice.sol?.estimated || null,
                        actual: order.finalPrice.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.finalPrice.usd?.estimated || null,
                        actual: order.finalPrice.usd?.actual || null,
                    },
                },
                buyAmount: {
                    sol: {
                        estimated: order.buyAmount.sol?.estimated || null,
                        actual: order.buyAmount.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.buyAmount.usd?.estimated || null,
                        actual: order.buyAmount.usd?.actual || null,
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
                tokenBuyAmount: {
                    estimated: order.tokenBuyAmount?.estimated || null,
                    actual: order.tokenBuyAmount?.actual || null,
                },
                tokenSellAmount: {
                    estimated: order.tokenSellAmount?.estimated || null,
                    actual: order.tokenSellAmount?.actual || null,
                },
                buyTime: new Date(order.buyTime).toISOString(),
                sellTime: order.sellTime
                    ? new Date(order.sellTime).toISOString()
                    : null,
                buyTxHash: order.buyTxHash,
                sellTxHash: order.sellTxHash,
            },
        });
        orderLogger.info(
            `added order to db ${order.userId}:${order.strategyId}:${order.mint}`,
        );
        return newOrder;
    } catch (error) {
        console.error("Error adding sniper order", error);
        orderLogger.error(
            `error adding order to db ${order.userId}:${order.strategyId}:${order.mint}`,
            error,
        );
        return null;
    }
}
