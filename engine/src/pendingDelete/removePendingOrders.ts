import getRedisClient, { RedisCache } from "../redis/store";
import prisma from "../prisma/prisma";
import { getTokenAmount } from "../onChain/sell/sell";
import { createSniperSellProcess } from "../sniperSell/handleProcess";
import getOrdersStore from "../redis/sniperOrders";
import { getOrderVolumeStore } from "../redis/orderVolume";

export const removePendingOrders = async () => {
    const pendingOrders = await prisma.sniperOrders.findMany({
        where: {
            AND: {
                status: "pending",
                buyTxHash: null,
                sellTxHash: null,
            },
        },
        select: {
            mint: true,
            id: true,
            userId: true,
            strategyId: true,
        },
    });
    if (!pendingOrders || pendingOrders.length === 0) {
        console.log("no pending orders found");
        return;
    }
    const sniperOrdersCache = await getOrdersStore();
    const orderVolumeCache = await getOrderVolumeStore();
    let ordersToDelete: number[] = [];
    console.log(`found ${pendingOrders.length} pending orders from db`);
    await Promise.all(
        pendingOrders.map(async (order) => {
            // const orderInfo = await tokenMap.readTestSniperOrder(
            //     order.mint ?? "",
            // );
            // const orderInfo = await sniperOrdersCache.readOrdersForMint(
            //     order.mint ?? "",
            // );
            const orderInfo = await sniperOrdersCache.readOneOrder(
                order.mint,
                order.userId,
                order.strategyId,
            );
            if (!orderInfo) {
                console.log("no order info found for", order.mint);
                return;
            }
            await Promise.all([
                sniperOrdersCache.deleteOrder(
                    orderInfo.mint,
                    orderInfo.userId,
                    orderInfo.strategyId,
                ),
                orderVolumeCache.canPlaceAndUpdateOrder(
                    `${orderInfo.userId}:${orderInfo.strategyId}`,
                    0,
                    orderInfo.orderAmountInUsd,
                    false,
                ),
            ]);
            ordersToDelete.push(order.id);
            //         orderInfo.map(async (redisOrder) => {
            //             if (redisOrder.status === "pending") {
            //                 // const hasToken = await getTokenAmount(
            //                 //     redisOrder.mint,
            //                 //     redisOrder.keypair.public,
            //                 // );
            //                 // if (hasToken) {
            //                 //     console.log("token found for", redisOrder.mint);
            //                 //     return;
            //                 // }
            //                 // await tokenMap.removeSniperProcessLock(redisOrder.mint, `${redisOrder.userId}:${redisOrder.strategyId}`)
            //                 // createSniperSellProcess(redisOrder.mint, redisOrder.finalPrice.sol?.actual ?? 0, redisOrder.finalPrice.usd?.actual ?? 0, false, `${redisOrder.userId}:${redisOrder.strategyId}`)
            //                 await sniperOrdersCache.deleteOrder(
            //                     redisOrder.mint,
            //                     redisOrder.userId,
            //                     redisOrder.strategyId,
            //                 );
            //                 await orderVolumeCache.canPlaceAndUpdateOrder(
            //                     `${redisOrder.userId}:${redisOrder.strategyId}`,
            //                     0,
            //                     redisOrder.orderAmountInUsd,
            //                     false,
            //                 );
            //                 await prisma.sniperOrders.delete({
            //                     where: {
            //                         id: order.id,
            //                     },
            //                 });
            //             }
            //         }),
            //     );
            // }),
            // );
            // await prisma.sniperOrders.deleteMany({
            //     where:{
            //         status: "pending"
            //     }
            // })
        }),
    );
    const deletedOrders = await prisma.sniperOrders.deleteMany({
        where: {
            id: {
                in: ordersToDelete,
            },
        },
    });
    console.log(deletedOrders.count, "deleted");
};

process.on("message", async () => {
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
    // const tokenMap = await getRedisClient();

    await removePendingOrders();
    // await tokenMap.disconnect()
    console.log("✅ remove pending orders process completed");
    process.exit();
});
