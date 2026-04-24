import type { sniperOrderRedis } from "../../redis/cache.type";
import { prisma } from "../../prisma/client";
import type { sniperOrders } from "@prisma/client";
import { logError } from "../errorLogger";

export async function updateOrder(
    order: sniperOrderRedis,
): Promise<sniperOrders | null> {
    try {
        /*
        using sniperOrdersTemp for stress testing revert back to sniperOrders after testing
      */
        // Find the existing order by mint, userId, and strategyId
        const existingOrder = await prisma.sniperOrders.findFirst({
            where: {
                mint: order.mint,
                userId: order.userId,
                strategyId: order.strategyId,
            },
        });

        if (!existingOrder) {
            console.error("Order not found for update");
            return null;
        }

        // Update the order with new values
        const updatedOrder = await prisma.sniperOrders.update({
            where: {
                id: existingOrder.id, // Using the id from the found record
            },
            data: {
                status: order.status,
                txFees: order.txFees,
                initialPrice: {
                    // update: {
                    sol: {
                        estimated: order.initialPrice.sol?.estimated || null,
                        actual: order.initialPrice.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.initialPrice.usd?.estimated || null,
                        actual: order.initialPrice.usd?.actual || null,
                    },
                    // },
                },
                finalPrice: {
                    // update: {
                    sol: {
                        estimated: order.finalPrice.sol?.estimated || null,
                        actual: order.finalPrice.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.finalPrice.usd?.estimated || null,
                        actual: order.finalPrice.usd?.actual || null,
                    },
                    // },
                },
                sellAmount: {
                    sol: {
                        estimated: order.sellAmount.sol?.estimated || null,
                        actual: order.sellAmount.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.sellAmount.usd?.estimated || null,
                        actual: order.sellAmount.usd?.actual || null,
                    },
                },
                tokenBuyAmount: {
                    // update: {
                    estimated: order.tokenBuyAmount?.estimated || null,
                    actual: order.tokenBuyAmount?.actual || null,
                    // },
                },
                tokenSellAmount: {
                    // update: {
                    estimated: order.tokenSellAmount?.estimated || null,
                    actual: order.tokenSellAmount?.actual || null,
                    // },
                },

                // buyTime: order.buyTime,
                sellTime: order.sellTime
                    ? new Date(order.sellTime).toISOString()
                    : null,
                // buyTxHash: order.buyTxHash,
                sellTxHash: order.sellTxHash,
                updatedAt: new Date(), // Update the timestamp
            },
        });
        // console.log("updated sniperOrder", updatedOrder);
        return updatedOrder;
    } catch (error) {
        logError((error as Error).message, error, { context: "order update" });
        // errorLoggerWithRotation.log("error", {
        //     message: (error as Error).message,
        //     stack: (error as Error).stack,
        // });
        console.error("Error updating sniper order", error);
        return null;
    }
}
