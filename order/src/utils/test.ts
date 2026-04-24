import { PumpAmmInternalSdk } from "@pump-fun/pump-swap-sdk";
import { config } from "../config";
import { PublicKey } from "@solana/web3.js";
import { divideBN } from "./divideBN";
import { getRedisConnection } from "../../redis/redisConnection";
import { prisma } from "../../prisma/client";
import getSniperOrdersStore from "../../redis/sniperOrders";
import { closeAccountTest } from "../sniperSell/closeAccount";

async function test(pool: string, decimals: number) {
    const poolKey = new PublicKey(pool);
    const internalSdk = new PumpAmmInternalSdk(config.connection);
    const poolReserves = await internalSdk.getPoolBaseAndQuoteAmounts(poolKey);
    const isQuoteSol = poolReserves.fetchedPool.quoteMint.equals(
        config.solMint,
    );
    const tokenReserves = divideBN(
        isQuoteSol ? poolReserves.poolBaseAmount : poolReserves.poolQuoteAmount,
        Math.pow(10, decimals),
        decimals,
        "tokenReserve",
    );
    const solReserves = divideBN(
        isQuoteSol ? poolReserves.poolQuoteAmount : poolReserves.poolBaseAmount,
        Math.pow(10, 9),
        9,
        "solReserve",
    );
    const priceInSol: number = solReserves / tokenReserves;
    console.log(priceInSol, poolReserves);
    return priceInSol;
}

// test("H3UYy8qzj6vnH8Fsz1494EAJSERwza4oeQKWZvntancQ", 6);

async function deleteActiveOrders() {
    const redis = await getRedisConnection();
    const client = redis.getClient();

    let cursor = 0;
    let totalDeleted = 0;

    do {
        const scanResult = await client.hScan("activeOrders", cursor, {
            MATCH: "38:44:*",
            COUNT: 100000,
        });

        cursor = scanResult.cursor;

        const fieldsToDelete = [];
        for (let i = 0; i < scanResult.tuples.length; i += 2) {
            fieldsToDelete.push(scanResult.tuples[i]);
        }

        if (fieldsToDelete.length > 0) {
            // const deleted = await client.hDel("activeOrders", fieldsToDelete);
            // totalDeleted += deleted;
            // console.log(`Deleted ${deleted} records, total: ${totalDeleted}`);
            await Promise.all(
                fieldsToDelete.map(async (field) => {
                    if (field?.field) {
                        let deleted = await client.hDel(
                            "activeOrders",
                            field.field,
                        );
                        totalDeleted += deleted;
                        console.log(
                            `Deleted ${deleted} records, total: ${totalDeleted}`,
                        );
                    }
                }),
            );
        }
    } while (cursor !== 0);

    console.log(`Total deleted: ${totalDeleted}`);
    return totalDeleted;
}

// deleteActiveOrders();

async function deletePending() {
    const ordersCache = await getSniperOrdersStore();
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
            // const deleteResult = await prisma.sniperOrders.deleteMany({
            //     where: {
            //         id: {
            //             in: ordersToDelete,
            //         },
            //     },
            // });
            // const deletedCount = deleteResult.count;
            // console.log(`Successfully deleted ${deletedCount} orphaned orders`);
        }
    } catch (error: any) {
        console.log("error deleting orders", error.message);
    }
}
async function getLowProfit() {
    const lowProfitStrategies = await prisma.sniperStrategies.findMany({
        where: {
            profit: {
                lt: 1,
            },
        },
        select: {
            id: true,
        },
    });
    console.log(
        `Found ${lowProfitStrategies.length} strategies with low profit`,
    );
    await Promise.all(
        lowProfitStrategies.map(async (strategy) => {
            await prisma.sniperStrategies.update({
                where: {
                    id: strategy.id,
                },
                data: {
                    profit: 1.3,
                },
            });
            console.log(`updated strategy ${strategy.id}`);
        }),
    );
}
// getLowProfit();

// deletePending();

async function deleteSolessTokens() {
    const solessPools = await prisma.sniperOrders.findMany({
        where: {
            mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
        },
        select: { id: true },
    });
    // console.log(`found ${solessPools.length} soless pools`);
    console.log(solessPools.length);
}

async function main() {
    const mints: string[] = [];
    // await Promise.all(
    //     mints.map(async (mint: string) => {
    //         await closeAccountTest(
    //             mint,
    //             {
    //                 public: "6x45feexbVnncFEwA4TT8tsjXLZFCTf1zJCtyd98QT5z",
    //                 private:
    //                     "41z1T6UudJdyF7wjgRTJzRRff2wJGBtrxYojf2GZSrAaKEL8zrF78jd3XtBEZ7rCGLWRDDo4VLSdvhtAjFiP1atY",
    //             },
    //             6,
    //         );
    //     }),
    // );
    await deleteSolessTokens();
}
main();
