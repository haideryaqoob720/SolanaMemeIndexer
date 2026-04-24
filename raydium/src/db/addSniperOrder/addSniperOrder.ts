import { sniperOrders } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { sniperOrder } from "../../types";
import getSniperStore, { SniperStore } from "../../redis/sniperStore";

async function addSniperOrder(
    order: sniperOrder,
): Promise<sniperOrders | null> {
    try {
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
                    // create:{
                    sol: {
                        estimated: order.initialPrice.sol?.estimated || null,
                        actual: order.initialPrice.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.initialPrice.usd?.estimated || null,
                        actual: order.initialPrice.usd?.actual || null,
                        // }
                    },
                },
                finalPrice: {
                    // create:{
                    sol: {
                        estimated: order.finalPrice.sol?.estimated || null,
                        actual: order.finalPrice.sol?.actual || null,
                    },
                    usd: {
                        estimated: order.finalPrice.usd?.estimated || null,
                        actual: order.finalPrice.usd?.actual || null,
                    },
                    // }
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
                    // create:{
                    estimated: order.tokenBuyAmount?.estimated || null,
                    actual: order.tokenBuyAmount?.actual || null,
                    // }
                },
                tokenSellAmount: {
                    // create:{
                    estimated: order.tokenSellAmount?.estimated || null,
                    actual: order.tokenSellAmount?.actual || null,
                    // }
                },
                buyTime: new Date(order.buyTime).toISOString(),
                // sellTime:new Date(order.sellTime).toISOString(),
                sellTime: order.sellTime
                    ? new Date(order.sellTime).toISOString()
                    : null,
                buyTxHash: order.buyTxHash,
                sellTxHash: order.sellTxHash,
            },
        });
        return newOrder;
    } catch (error) {
        console.error("Error adding sniper order", error);
        return null;
    }
}

async function checkMint(mint: string): Promise<boolean> {
    try {
        const existingMint = await prisma.tokens.findUnique({
            where: {
                mint: mint,
            },
        });
        if (!existingMint) {
            return false;
        }
        return true;
    } catch (error: any) {
        console.log("error finding mint in tokens when buying pumpswap");
        return false;
    }
}

export async function findMint(
    //   fn: () => Promise<boolean> | boolean,
    mint: string,
    initialTimeout: number = 2000,
    maxRetries: number = 3,
): Promise<boolean> {
    let currentRetry = 0;
    let currentTimeout = initialTimeout;
    while (currentRetry < maxRetries) {
        // Wait for the timeout period
        await new Promise((resolve) => setTimeout(resolve, currentTimeout));

        // Execute the function again
        const result = await checkMint(mint);

        // If successful, return true
        if (result) {
            return true;
        }

        // Increment retry counter
        currentRetry++;

        // Multiply timeout for next attempt
        currentTimeout *= 2;
    }
    return false;
}

const [order, userId, strategyId] = process.argv.slice(2);
process.on("message", async () => {
    const orderData: sniperOrder = JSON.parse(order);
    // const cache = new SniperStore()
    // await cache.connect()
    const cache = await getSniperStore();
    const spawnProcess: boolean = await cache.canSpawnNewDbAddSniperProcess(
        orderData.mint,
        userId,
        strategyId,
    );
    if (!spawnProcess) {
        console.log(`sniper process already running for ${orderData.mint}`);
        await cache.disconnect();
        process.exit();
    }
    await cache.placeSniperDbAddProcessLock(orderData.mint, userId, strategyId);
    const mint = await findMint(orderData.mint);
    if (!mint) {
        await cache.removeSniperDbAddProcessLock(
            orderData.mint,
            userId,
            strategyId,
        );
        process.exit();
    }
    const newOrder = await addSniperOrder(orderData);
    await cache.removeSniperDbAddProcessLock(
        orderData.mint,
        userId,
        strategyId,
    );
    await cache.disconnect();
    console.log(`✅ added sniper order to db, orderId: ${newOrder?.id}`);
    process.exit();
});
