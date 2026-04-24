import prisma from "../prisma/prisma";
import getAnalyticOrdersCache, {
    AnalyticOrdersStore,
} from "../redis/analyticOrders";
// const prisma = new PrismaClient();

export const addOrderAnalytics = async (cache: AnalyticOrdersStore) => {
    try {
        // console.log("Started process to save the order analytics:");
        await syncCache(cache);
    } catch (error: any) {
        console.log("error adding all order analytics", error.message);
    }
};

process.title = "order_analytics";
process.on("message", async () => {
    // console.log(process.pid, "process Pid")
    console.log("order analytics process started");
    const analyticsCache = await getAnalyticOrdersCache();
    await addOrderAnalytics(analyticsCache);
    await prisma.$disconnect();
    process.exit();
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    console.log("error in process ...................");
});

async function syncCache(cache: AnalyticOrdersStore) {
    console.log("analytic orders sync process **********-----------------***********");

    let orders = await cache.getAnalyticOrders();

    if (!orders || orders.length === 0) {
        console.log("order does not exist in cache.");
        return;
    }

    console.log("order analytics in cache before sync: ", orders.length);

    const orderIds = orders.map((o: any) => o.orderid);

    const existingOrders = await prisma.sniperOrders.findMany({
        where: {
            id: {
                in: orderIds,
            },
        },
        select: {
            id: true,
        },
    });

    const existingOrderIds = new Set(existingOrders.map(o => o.id));

    const filteredOrders = orders.filter((o: any) => existingOrderIds.has(o.orderid));

    if (filteredOrders.length === 0) {
        console.log("No valid order IDs found in sniper_orders. Skipping sync.");
        return;
    }

    try {
        await prisma.order_analytics.createMany({
            data: filteredOrders,
        });

        await Promise.all(
            filteredOrders.map(async (record: any) => {
                const cacheKey = `${record.orderid}-${record.mint}-${record.is_buy}`
                if (cacheKey) {
                    await cache.deleteProcessedOrder(cacheKey);
                }
            }),
        );

        console.log("order analytics in cache AFTER sync: ", (await cache.getAnalyticOrders()).length);
        console.log("order analytic synced Cache");
    } catch (error: any) {
        console.error("error creating many order analytics", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

