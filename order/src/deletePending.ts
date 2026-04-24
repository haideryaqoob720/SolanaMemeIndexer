import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
async function deletePendingOrders() {
    try {
        await prisma.sniperOrders.deleteMany({
            where: {
                AND: {
                    // status: "pending",
                    // buyTxHash: null,
                },
            },
        });
    } catch (error) {
        console.error(error);
    }
}

async function deleteMintOrders(mint: string) {
    await prisma.sniperOrders.deleteMany({
        where: {
            AND: {
                mint: mint,
                buyTxHash: null,
            },
        },
    });
}

async function highProfit(mint?: string) {
    try {
        const query = `DELETE FROM sniper_orders
  WHERE (sell_amount->'usd'->>'actual')::numeric >= (order_amount_in_usd * 2)
  AND buy_tx_hash IS NULL
  AND sell_tx_hash IS NULL`;

        const result = await prisma.$executeRawUnsafe(query);
        console.log("High profit orders deleted:", result);
        return result;
    } catch (error) {
        console.error("Error deleting high profit orders:", error);
        throw error;
    }
}
async function run() {
    // await deletePendingOrders();
    // await deleteMintOrders("8W629pZGtZpN1c3ztiw2wnMZKqNj3CJYBkQDu4pVpDaW");

    // Example usage of the fixed highProfit function
    try {
        await highProfit();
    } catch (error) {
        console.error("Failed to delete high profit orders:", error);
    }

    console.log("Operations completed");
}

run();
