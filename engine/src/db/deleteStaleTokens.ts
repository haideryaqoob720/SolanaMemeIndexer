import prisma from "../prisma/prisma";
import getHolderStore from "../redis/holders";
import getPumpSwapStore from "../redis/pumpswap";
import getRedisClient from "../redis/store";

const BATCH_SIZE = 1000; // Fetch 1000 tokens at a time for filtering
const TX_BATCH_SIZE = 500; // Delete transactions in batches of 500

export async function deleteStaleTokens() {
    console.log("Starting stale token deletion process...");

    // Process PumpSwap tokens
    await processPumpSwapTokens();

    // Process Raydium tokens
    await processRaydiumTokens();

    await processPumpTokens();

    console.log("Stale token deletion completed.");
}

async function processPumpSwapTokens() {
    const liquidityThreshold = 100;
    let offset = 0;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        const batch = await filterPumpSwapBatch(
            liquidityThreshold,
            BATCH_SIZE,
            offset,
        );

        if (!batch || batch.length === 0) {
            hasMore = false;
            break;
        }

        console.log(
            `Processing PumpSwap batch: ${offset} to ${offset + batch.length}`,
        );

        // Process tokens one by one to handle large transaction volumes
        for (let i = 0; i < batch.length; i++) {
            const mint = batch[i];
            try {
                await deleteSinglePumpSwapToken(mint);
                if ((i + 1) % 10 === 0) {
                    console.log(
                        `Processed ${i + 1}/${batch.length} tokens in current batch`,
                    );
                }
            } catch (error) {
                console.error(`Failed to delete token ${mint}:`, error);
                // Continue with next token
            }
        }

        totalProcessed += batch.length;
        offset += BATCH_SIZE;

        // If we got less than BATCH_SIZE, we've reached the end
        if (batch.length < BATCH_SIZE) {
            hasMore = false;
        }
    }

    console.log(`Total PumpSwap tokens processed: ${totalProcessed}`);
}

async function processRaydiumTokens() {
    const liquidityThreshold = 100;
    let offset = 0;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        const batch = await filterRaydiumBatch(
            liquidityThreshold,
            BATCH_SIZE,
            offset,
        );

        if (!batch || batch.length === 0) {
            hasMore = false;
            break;
        }

        console.log(
            `Processing Raydium batch: ${offset} to ${offset + batch.length}`,
        );

        // Process tokens one by one to handle large transaction volumes
        for (let i = 0; i < batch.length; i++) {
            const mint = batch[i];
            try {
                await deleteSingleRaydiumToken(mint);
                if ((i + 1) % 10 === 0) {
                    console.log(
                        `Processed ${i + 1}/${batch.length} tokens in current batch`,
                    );
                }
            } catch (error) {
                console.error(`Failed to delete token ${mint}:`, error);
                // Continue with next token
            }
        }

        totalProcessed += batch.length;
        offset += BATCH_SIZE;

        // If we got less than BATCH_SIZE, we've reached the end
        if (batch.length < BATCH_SIZE) {
            hasMore = false;
        }
    }

    console.log(`Total Raydium tokens processed: ${totalProcessed}`);
}

async function filterPumpSwapBatch(
    liquidityInUsd: number,
    limit: number,
    offset: number,
): Promise<string[] | undefined> {
    try {
        // Get low liquidity tokens with pagination
        const lowLiquidityTokens = await prisma.pumpswapTokens.findMany({
            where: {
                liquidityInUsd: {
                    lt: liquidityInUsd,
                },
            },
            select: {
                mint: true,
            },
            take: limit,
            skip: offset,
            orderBy: {
                mint: "asc", // Consistent ordering for pagination
            },
        });

        if (!lowLiquidityTokens || lowLiquidityTokens.length === 0) {
            return undefined;
        }

        const mints = lowLiquidityTokens.map((token) => token.mint);

        // Check for recent transactions
        const createdBefore = new Date(Date.now() - 0.5 * 60 * 60 * 1000);
        const recentTx = await prisma.transactions.findMany({
            where: {
                mint: {
                    in: mints,
                },
                created_at: {
                    gte: createdBefore,
                },
            },
            select: {
                mint: true,
            },
            distinct: ["mint"],
        });

        const tokensWithRecentTx = new Set(recentTx.map((tx) => tx.mint));
        const inactiveTokens = mints.filter(
            (mint) => !tokensWithRecentTx.has(mint),
        );

        if (inactiveTokens.length === 0) {
            console.log(
                `No inactive tokens found in batch ${offset}-${offset + limit}`,
            );
            return undefined;
        }

        console.log(
            `Found ${inactiveTokens.length} inactive tokens in PumpSwap batch`,
        );
        return inactiveTokens;
    } catch (error: any) {
        console.error("Error filtering PumpSwap tokens:", error.message);
        return undefined;
    }
}

async function filterRaydiumBatch(
    liquidityInUsd: number,
    limit: number,
    offset: number,
): Promise<string[] | undefined> {
    try {
        // Get low liquidity tokens with pagination
        const lowLiquidityTokens = await prisma.raydium_tokens.findMany({
            where: {
                liquidity_in_usd: {
                    lt: liquidityInUsd,
                },
            },
            select: {
                mint: true,
            },
            take: limit,
            skip: offset,
            orderBy: {
                mint: "asc", // Consistent ordering for pagination
            },
        });

        if (!lowLiquidityTokens || lowLiquidityTokens.length === 0) {
            return undefined;
        }

        const mints = lowLiquidityTokens.map((token) => token.mint);

        // Check for recent transactions
        const createdBefore = new Date(Date.now() - 0.5 * 60 * 60 * 1000);
        const recentTx = await prisma.transactions.findMany({
            where: {
                mint: {
                    in: mints,
                },
                created_at: {
                    gte: createdBefore,
                },
            },
            select: {
                mint: true,
            },
            distinct: ["mint"],
        });

        const tokensWithRecentTx = new Set(recentTx.map((tx) => tx.mint));
        const inactiveTokens = mints.filter(
            (mint) => !tokensWithRecentTx.has(mint),
        );

        if (inactiveTokens.length === 0) {
            console.log(
                `No inactive tokens found in batch ${offset}-${offset + limit}`,
            );
            return undefined;
        }

        console.log(
            `Found ${inactiveTokens.length} inactive tokens in Raydium batch`,
        );
        return inactiveTokens;
    } catch (error: any) {
        console.error("Error filtering Raydium tokens:", error.message);
        return undefined;
    }
}

async function deleteSinglePumpSwapToken(mint: string) {
    const tokenMap = await getRedisClient();
    const pumpSwapCache = await getPumpSwapStore();
    const holdersCache = await getHolderStore();

    try {
        // First, get the count of transactions
        const txCount = await prisma.transactions.count({
            where: { mint },
        });

        console.log(
            `Deleting PumpSwap token ${mint} with ${txCount} transactions`,
        );

        // Delete all transactions for this mint
        const deletedTransactions = await prisma.transactions.deleteMany({
            where: { mint },
        });

        console.log(
            `Deleted ${deletedTransactions.count} transactions for ${mint}`,
        );

        // Delete related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete pump token
            const deletedPumpToken = await tx.pumpswapTokens
                .delete({
                    where: { mint },
                })
                .catch(() => null); // Ignore if already deleted

            // Delete rug score
            const deletedRugScore = await tx.rug_score.deleteMany({
                where: { mint },
            });

            if (deletedPumpToken) {
                console.log(`Deleted PumpSwap token: ${mint}`);
            }
            if (deletedRugScore.count > 0) {
                console.log(`Deleted rug score for: ${mint}`);
            }
        });

        // Delete from Redis caches - comprehensive cleanup
        await Promise.all([
            holdersCache.removeHoldersForMint(mint),
            tokenMap
                .deleteHoldersForToken(mint)
                .catch((err) =>
                    console.error(`Error deleting holders for ${mint}:`, err),
                ),
            tokenMap
                .deleteTestSniperOrder(mint, 35, 35)
                .catch((err) =>
                    console.error(
                        `Error deleting test sniper order for ${mint}:`,
                        err,
                    ),
                ),
            pumpSwapCache
                .deleteToken(mint)
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from PumpSwap cache:`,
                        err,
                    ),
                ),
            tokenMap
                .deleteToken(mint)
                .catch((err) =>
                    console.error(`Error deleting token ${mint}:`, err),
                ),
            tokenMap
                .deleteManyPump([mint])
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from pump collection:`,
                        err,
                    ),
                ),
        ]);

        console.log(`Deleted all data for ${mint}`);
    } catch (error: any) {
        console.error(`Error deleting PumpSwap token ${mint}:`, error.message);
        throw error;
    }

    try {
        // Delete related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete pump token
            const deletedPumpToken = await tx.pumpswapTokens
                .delete({
                    where: { mint },
                })
                .catch(() => null); // Ignore if already deleted

            // Delete rug score
            const deletedRugScore = await tx.rug_score.deleteMany({
                where: { mint },
            });

            if (deletedPumpToken) {
                console.log(`Deleted PumpSwap token: ${mint}`);
            }
            if (deletedRugScore.count > 0) {
                console.log(`Deleted rug score for: ${mint}`);
            }
        });

        // Delete from Redis caches - comprehensive cleanup
        await Promise.all([
            tokenMap
                .deleteHoldersForToken(mint)
                .catch((err) =>
                    console.error(`Error deleting holders for ${mint}:`, err),
                ),
            tokenMap
                .deleteTestSniperOrder(mint, 35, 35)
                .catch((err) =>
                    console.error(
                        `Error deleting test sniper order for ${mint}:`,
                        err,
                    ),
                ),
            pumpSwapCache
                .deleteToken(mint)
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from PumpSwap cache:`,
                        err,
                    ),
                ),
            tokenMap
                .deleteToken(mint)
                .catch((err) =>
                    console.error(`Error deleting token ${mint}:`, err),
                ),
            tokenMap
                .deleteManyPump([mint])
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from pump collection:`,
                        err,
                    ),
                ),
        ]);

        console.log(`Deleted all data for ${mint}`);
    } catch (error: any) {
        console.error(`Error deleting PumpSwap token ${mint}:`, error.message);
        throw error;
    }
}

async function deleteSingleRaydiumToken(mint: string) {
    const tokenMap = await getRedisClient();
    const holdersCache = await getHolderStore();

    try {
        // First, get the count of transactions
        const txCount = await prisma.transactions.count({
            where: { mint },
        });

        console.log(
            `Deleting Raydium token ${mint} with ${txCount} transactions`,
        );

        // Delete all transactions for this mint
        const deletedTransactions = await prisma.transactions.deleteMany({
            where: { mint },
        });

        console.log(
            `Deleted ${deletedTransactions.count} transactions for ${mint}`,
        );

        // Delete related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete raydium token
            const deletedRaydium = await tx.raydium_tokens
                .delete({
                    where: { mint },
                })
                .catch(() => null); // Ignore if already deleted

            // Delete rug score
            const deletedRugScore = await tx.rug_score.deleteMany({
                where: { mint },
            });

            if (deletedRaydium) {
                console.log(`Deleted Raydium token: ${mint}`);
            }
            if (deletedRugScore.count > 0) {
                console.log(`Deleted rug score for: ${mint}`);
            }
        });

        // Delete from Redis caches - comprehensive cleanup
        await Promise.all([
            holdersCache.removeHoldersForMint(mint),
            tokenMap
                .deleteHoldersForToken(mint)
                .catch((err) =>
                    console.error(`Error deleting holders for ${mint}:`, err),
                ),
            tokenMap
                .deleteTestSniperOrder(mint, 35, 35)
                .catch((err) =>
                    console.error(
                        `Error deleting test sniper order for ${mint}:`,
                        err,
                    ),
                ),
            tokenMap
                .deleteToken(mint)
                .catch((err) =>
                    console.error(`Error deleting token ${mint}:`, err),
                ),
            tokenMap
                .deleteManyRaydium([mint])
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from Raydium collection:`,
                        err,
                    ),
                ),
        ]);

        console.log(`Deleted all data for ${mint}`);
    } catch (error: any) {
        console.error(`Error deleting Raydium token ${mint}:`, error.message);
        throw error;
    }
    try {
        // Delete related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete raydium token
            const deletedRaydium = await tx.raydium_tokens
                .delete({
                    where: { mint },
                })
                .catch(() => null); // Ignore if already deleted

            // Delete rug score
            const deletedRugScore = await tx.rug_score.deleteMany({
                where: { mint },
            });

            if (deletedRaydium) {
                console.log(`Deleted Raydium token: ${mint}`);
            }
            if (deletedRugScore.count > 0) {
                console.log(`Deleted rug score for: ${mint}`);
            }
        });

        // Delete from Redis caches - comprehensive cleanup
        await Promise.all([
            tokenMap
                .deleteHoldersForToken(mint)
                .catch((err) =>
                    console.error(`Error deleting holders for ${mint}:`, err),
                ),
            tokenMap
                .deleteTestSniperOrder(mint, 35, 35)
                .catch((err) =>
                    console.error(
                        `Error deleting test sniper order for ${mint}:`,
                        err,
                    ),
                ),
            tokenMap
                .deleteToken(mint)
                .catch((err) =>
                    console.error(`Error deleting token ${mint}:`, err),
                ),
            tokenMap
                .deleteManyRaydium([mint])
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from Raydium collection:`,
                        err,
                    ),
                ),
        ]);

        console.log(`Deleted all data for ${mint}`);
    } catch (error: any) {
        console.error(`Error deleting Raydium token ${mint}:`, error.message);
        throw error;
    }
}

// Batch deletion functions for backward compatibility
export async function deletePumpSwapTokens(mints: string[]) {
    console.log(`Processing ${mints.length} PumpSwap tokens one by one...`);
    for (const mint of mints) {
        await deleteSinglePumpSwapToken(mint);
    }
}

export async function deleteRaydiumTokens(mints: string[]) {
    console.log(`Processing ${mints.length} Raydium tokens one by one...`);
    for (const mint of mints) {
        await deleteSingleRaydiumToken(mint);
    }
}

// const BATCH_SIZE = 1000;

function getFilterClause(hours: number, progress: number) {
    const createdBefore = new Date(Date.now() - hours * 60 * 60 * 1000);
    console.log(createdBefore);
    return {
        OR: [
            {
                bonding_progress: {
                    gt: 100,
                },
            },
            {
                AND: [
                    {
                        OR: [
                            {
                                bonding_progress: {
                                    lt: progress,
                                },
                            },
                            {
                                bonding_progress: null,
                            },
                        ],
                    },
                    {
                        created_at: {
                            lt: createdBefore,
                        },
                    },
                ],
            },
        ],
    };
}

export async function processPumpTokens() {
    const hours = 3; // You can adjust this
    const progress = 50; // You can adjust this
    let offset = 0;
    let hasMore = true;
    let totalProcessed = 0;

    while (hasMore) {
        const batch = await filterPumpTokensBatch(
            hours,
            progress,
            BATCH_SIZE,
            offset,
        );

        if (!batch || batch.length === 0) {
            hasMore = false;
            break;
        }

        console.log(
            `Processing Pump tokens batch: ${offset} to ${offset + batch.length}`,
        );

        // Process tokens one by one to handle large transaction volumes
        for (let i = 0; i < batch.length; i++) {
            const mint = batch[i];
            try {
                await deleteSinglePumpToken(mint);
                if ((i + 1) % 10 === 0) {
                    console.log(
                        `Processed ${i + 1}/${batch.length} tokens in current batch`,
                    );
                }
            } catch (error) {
                console.error(`Failed to delete token ${mint}:`, error);
                // Continue with next token
            }
        }

        totalProcessed += batch.length;
        offset += BATCH_SIZE;

        // If we got less than BATCH_SIZE, we've reached the end
        if (batch.length < BATCH_SIZE) {
            hasMore = false;
        }
    }

    console.log(`Total Pump tokens processed: ${totalProcessed}`);
}

async function filterPumpTokensBatch(
    hours: number,
    progress: number,
    limit: number,
    offset: number,
): Promise<string[] | undefined> {
    try {
        // Get tokens matching the filter clause
        const filteredTokens = await prisma.pump_tokens.findMany({
            where: getFilterClause(hours, progress),
            select: {
                mint: true,
            },
            take: limit,
            skip: offset,
            orderBy: {
                mint: "asc", // Consistent ordering for pagination
            },
        });

        if (!filteredTokens || filteredTokens.length === 0) {
            return undefined;
        }

        const mints = filteredTokens.map((token) => token.mint);

        // Check for transactions in the past hour
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
        const recentTx = await prisma.transactions.findMany({
            where: {
                mint: {
                    in: mints,
                },
                created_at: {
                    gte: oneHourAgo,
                },
            },
            select: {
                mint: true,
            },
            distinct: ["mint"],
        });

        const tokensWithRecentTx = new Set(recentTx.map((tx) => tx.mint));
        const inactiveTokens = mints.filter(
            (mint) => !tokensWithRecentTx.has(mint),
        );

        if (inactiveTokens.length === 0) {
            console.log(
                `No inactive tokens found in batch ${offset}-${offset + limit}`,
            );
            return undefined;
        }

        console.log(
            `Found ${inactiveTokens.length} inactive pump tokens in batch`,
        );
        return inactiveTokens;
    } catch (error: any) {
        console.error("Error filtering pump tokens:", error.message);
        return undefined;
    }
}

async function deleteSinglePumpToken(mint: string) {
    const tokenMap = await getRedisClient();
    // const pumpSwapCache = await getPumpSwapStore();

    try {
        // First, get the count of transactions
        const txCount = await prisma.transactions.count({
            where: { mint },
        });

        console.log(`Deleting Pump token ${mint} with ${txCount} transactions`);

        // Delete all transactions for this mint
        const deletedTransactions = await prisma.transactions.deleteMany({
            where: { mint },
        });

        console.log(
            `Deleted ${deletedTransactions.count} transactions for ${mint}`,
        );

        // Delete related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete pump token
            const deletedPumpToken = await tx.pump_tokens
                .delete({
                    where: { mint },
                })
                .catch(() => null); // Ignore if already deleted

            // Delete rug score
            const deletedRugScore = await tx.rug_score.deleteMany({
                where: { mint },
            });

            if (deletedPumpToken) {
                console.log(`Deleted Pump token: ${mint}`);
            }
            if (deletedRugScore.count > 0) {
                console.log(`Deleted rug score for: ${mint}`);
            }
        });

        // Delete from Redis caches - comprehensive cleanup
        await Promise.all([
            tokenMap
                .deleteHoldersForToken(mint)
                .catch((err) =>
                    console.error(`Error deleting holders for ${mint}:`, err),
                ),
            // tokenMap
            //     .deleteTestSniperOrder(mint, 35, 35)
            //     .catch((err) =>
            //         console.error(
            //             `Error deleting test sniper order for ${mint}:`,
            //             err,
            //         ),
            //     ),
            // pumpSwapCache
            //     .deleteToken(mint)
            //     .catch((err) =>
            //         console.error(
            //             `Error deleting ${mint} from PumpSwap cache:`,
            //             err,
            //         ),
            //     ),
            tokenMap
                .deleteToken(mint)
                .catch((err) =>
                    console.error(`Error deleting token ${mint}:`, err),
                ),
            tokenMap
                .deleteManyPump([mint])
                .catch((err) =>
                    console.error(
                        `Error deleting ${mint} from pump collection:`,
                        err,
                    ),
                ),
        ]);

        console.log(`Deleted all data for ${mint}`);
    } catch (error: any) {
        console.error(`Error deleting Pump token ${mint}:`, error.message);
        throw error;
    }
}

// Export for batch compatibility if needed
export async function deletePumpTokens(mints: string[]) {
    console.log(`Processing ${mints.length} Pump tokens one by one...`);
    for (const mint of mints) {
        await deleteSinglePumpToken(mint);
    }
}

// Process event handlers for forked process
process.on("message", async () => {
    try {
        await deleteStaleTokens();
        process.exit(0);
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
});

process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

// Handle uncaught errors
process.on("uncaughtException", async (error) => {
    console.error("Uncaught Exception:", error);
    await prisma.$disconnect();
    process.exit(1);
});

process.on("unhandledRejection", async (error) => {
    console.error("Unhandled Rejection:", error);
    await prisma.$disconnect();
    process.exit(1);
});
