import prisma from "../prisma/prisma";
import getOrdersStore from "../redis/sniperOrders";
import { CronJob } from "cron";
async function deletePending() {
    const ordersCache = await getOrdersStore();
    try {
        const pendingOrders = await prisma.sniperOrders.findMany({
            where: {
                AND: {
                    status: "pending",
                    buyTxHash: null,
                    sellTxHash: null,
                },
            },
            select: {
                id: true,
                mint: true,
                userId: true,
                strategyId: true,
            },
        });
        console.log(
            `Found ${pendingOrders.length} orders matching criteria in database`,
        );
        let ordersToDelete: number[] = [];
        for (const order of pendingOrders) {
            const orderInRedis = await ordersCache.readOneOrder(
                order.mint,
                order.userId,
                order.strategyId,
            );
            if (!orderInRedis) {
                ordersToDelete.push(order.id);
            }
        }
        console.log(`Found ${ordersToDelete.length} orders to delete`);
        if (ordersToDelete.length > 0) {
            const deleteResult = await prisma.sniperOrders.deleteMany({
                where: {
                    id: {
                        in: ordersToDelete,
                    },
                },
            });
            const deletedCount = deleteResult.count;
            console.log(`Successfully deleted ${deletedCount} orphaned orders`);
        }
    } catch (error: any) {
        console.log("error deleting orders", error.message);
    }
}

export function deleteOrphanedOrders() {
    const job = new CronJob(
        "0 */15 * * * *",
        async () => {
            await deletePending();
        },
        null,
        true,
    );
}
