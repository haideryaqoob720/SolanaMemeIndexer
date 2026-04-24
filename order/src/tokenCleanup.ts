import { PrismaClient } from "@prisma/client";
import { createClient } from "redis";

const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

const redis = createClient({
    url: process.env.REDIS_URL || "redis://default:redisLamboRadar@46.4.21.252:6379/0",
});

// Configuration
const BATCH_SIZE = 1000;
const TRANSACTION_BATCH_SIZE = 1000; // Smaller batch for transactions
const REDIS_BATCH_SIZE = 500; // Batch size for Redis operations
const DELAY_BETWEEN_BATCHES = 200; // milliseconds
const TRANSACTION_DELAY = 500; // Longer delay for transactions
const LOG_INTERVAL = 5000; // Log progress every 5k records
const RECENT_ACTIVITY_WINDOW_MINUTES = 120; // Skip tokens with activity in last N minutes

interface CleanupStats {
    tokensToDelete: number;
    tokensWithOrders: number;
    tokensWithRecentActivity: number;
    totalTokensToKeep: number;
    deletedTransactions: number;
    deletedHotMonitoring: number;
    deletedHotTokens: number;
    deletedPumpTokens: number;
    deletedPumpswapTokens: number;
    deletedRaydiumTokens: number;
    deletedRugCheck: number;
    deletedTokenPools: number;
    deletedTokens: number;
    deletedRedisHolders: number;
    deletedFromTokensSet: number;
    totalProcessed: number;
}

class TokenCleanupService {
    private stats: CleanupStats = {
        tokensToDelete: 0,
        tokensWithOrders: 0,
        tokensWithRecentActivity: 0,
        totalTokensToKeep: 0,
        deletedTransactions: 0,
        deletedHotMonitoring: 0,
        deletedHotTokens: 0,
        deletedPumpTokens: 0,
        deletedPumpswapTokens: 0,
        deletedRaydiumTokens: 0,
        deletedRugCheck: 0,
        deletedTokenPools: 0,
        deletedTokens: 0,
        deletedRedisHolders: 0,
        deletedFromTokensSet: 0,
        totalProcessed: 0,
    };

    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async logProgress(message: string, force = false): Promise<void> {
        if (force || this.stats.totalProcessed % LOG_INTERVAL === 0) {
            console.log(`[${new Date().toISOString()}] ${message}`);
            console.log(`Progress: ${JSON.stringify(this.stats, null, 2)}`);

            // Store progress in Redis for monitoring
            try {
                await redis.set(
                    "token_cleanup_progress",
                    JSON.stringify(this.stats),
                );
            } catch (error) {
                console.error("Error storing progress in Redis:", error);
            }
        }
    }

    private async getTokensToDelete(): Promise<string[]> {
        console.log("Identifying tokens to delete...");

        // Get all mints that have sniper orders (these should be kept)
        const tokensWithOrders = await prisma.sniperOrders.findMany({
            select: { mint: true },
            distinct: ["mint"],
        });

        const mintsToKeep = new Set(
            tokensWithOrders.map((order) => order.mint),
        );
        this.stats.tokensWithOrders = mintsToKeep.size;
        console.log(
            `Found ${mintsToKeep.size} tokens with sniper orders to keep`,
        );

        // Get tokens that have transactions in the last N minutes
        const activityWindowSeconds = RECENT_ACTIVITY_WINDOW_MINUTES * 60;
        const cutoffTimestamp =
            Math.floor(Date.now() / 1000) - activityWindowSeconds;
        const cutoffDate = new Date(Date.now() - activityWindowSeconds * 1000);

        console.log(
            `Finding tokens with recent transactions (since ${cutoffDate.toISOString()})...`,
        );

        // Use a more efficient query with raw SQL
        const tokensWithRecentActivity = await prisma.$queryRaw<
            { mint: string }[]
        >`
      SELECT DISTINCT mint
      FROM transactions
      WHERE (timestamp >= ${cutoffTimestamp} OR created_at >= ${cutoffDate})
    `;

        const mintsWithRecentActivity = new Set(
            tokensWithRecentActivity.map((tx) => tx.mint),
        );
        this.stats.tokensWithRecentActivity = mintsWithRecentActivity.size;
        console.log(
            `Found ${mintsWithRecentActivity.size} tokens with recent activity to keep`,
        );

        // Combine both sets of tokens to keep
        const allMintsToKeep = new Set([
            ...mintsToKeep,
            ...mintsWithRecentActivity,
        ]);

        this.stats.totalTokensToKeep = allMintsToKeep.size;
        console.log(
            `Total tokens to keep: ${allMintsToKeep.size} (${mintsToKeep.size} with orders + ${mintsWithRecentActivity.size} with recent activity)`,
        );

        // Log some examples of tokens being kept due to recent activity (for verification)
        if (mintsWithRecentActivity.size > 0) {
            const recentActivityTokens = Array.from(
                mintsWithRecentActivity,
            ).slice(0, 5);
            console.log(
                `Examples of tokens with recent activity: ${recentActivityTokens.join(", ")}`,
            );
        }

        // Get all token mints in batches and filter out ones to keep
        const tokensToDelete: string[] = [];
        let offset = 0;

        while (true) {
            const tokens = await prisma.tokens.findMany({
                select: { mint: true },
                skip: offset,
                take: BATCH_SIZE * 10, // Larger batch for reading
            });

            if (tokens.length === 0) break;

            for (const token of tokens) {
                if (!allMintsToKeep.has(token.mint)) {
                    tokensToDelete.push(token.mint);
                }
            }

            offset += tokens.length;
            console.log(
                `Processed ${offset} tokens, found ${tokensToDelete.length} to delete`,
            );
        }

        this.stats.tokensToDelete = tokensToDelete.length;
        console.log(`Total tokens to delete: ${tokensToDelete.length}`);

        return tokensToDelete;
    }

    private async deleteInBatches<T>(
        tableName: string,
        deleteOperation: (mints: string[]) => Promise<{ count: number }>,
        mints: string[],
    ): Promise<number> {
        let totalDeleted = 0;

        for (let i = 0; i < mints.length; i += BATCH_SIZE) {
            const batch = mints.slice(i, i + BATCH_SIZE);

            try {
                const result = await deleteOperation(batch);
                totalDeleted += result.count;

                await this.logProgress(
                    `${tableName}: Deleted ${result.count} records (batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mints.length / BATCH_SIZE)})`,
                );

                await this.delay(DELAY_BETWEEN_BATCHES);
            } catch (error) {
                console.error(`Error deleting batch from ${tableName}:`, error);
                // Continue with next batch instead of failing completely
            }
        }

        return totalDeleted;
    }

    private async deleteTransactions(mints: string[]): Promise<void> {
        console.log("Deleting transactions using chunked approach...");

        let totalDeleted = 0;
        let processedMints = 0;

        // Process mints in very small batches for transactions
        for (let i = 0; i < mints.length; i += TRANSACTION_BATCH_SIZE) {
            const mintBatch = mints.slice(i, i + TRANSACTION_BATCH_SIZE);

            try {
                // Use a more efficient approach: delete in smaller chunks per mint
                for (const mint of mintBatch) {
                    let deletedForMint = 0;
                    let hasMore = true;

                    while (hasMore) {
                        try {
                            // Delete transactions for this mint in small chunks
                            const result = await prisma.$executeRaw`
                DELETE FROM transactions
                WHERE id IN (
                  SELECT id FROM transactions
                  WHERE mint = ${mint}
                  LIMIT 10000
                )
              `;
                            const poolTxRes = await prisma.$executeRaw`
                DELETE FROM pool_transactions
                WHERE id IN (
                  SELECT id FROM pool_transactions
                  WHERE mint = ${mint}
                  LIMIT 10000
                )
              `;

                            deletedForMint += Number(result);
                            deletedForMint += Number(poolTxRes);

                            totalDeleted += Number(result);
                            totalDeleted += Number(poolTxRes);

                            // If we deleted less than 1000, we're done with this mint
                            hasMore = Number(result) === 1000;

                            if (
                                deletedForMint > 0 &&
                                deletedForMint % 10000 === 0
                            ) {
                                console.log(
                                    `Deleted ${deletedForMint} transactions for mint ${mint}`,
                                );
                            }

                            // Small delay to prevent overwhelming the database
                            await this.delay(50);
                        } catch (error) {
                            console.error(
                                `Error deleting transactions for mint ${mint}:`,
                                error,
                            );
                            hasMore = false; // Stop processing this mint on error
                        }
                    }

                    processedMints++;

                    if (processedMints % 100 === 0) {
                        console.log(
                            `Processed ${processedMints}/${mints.length} mints, deleted ${totalDeleted} total transactions`,
                        );
                        this.stats.deletedTransactions = totalDeleted;
                        await this.logProgress(
                            `Transaction deletion progress: ${processedMints}/${mints.length} mints`,
                        );
                    }
                }

                await this.delay(TRANSACTION_DELAY);
            } catch (error) {
                console.error(`Error processing mint batch:`, error);
                // Continue with next batch
            }
        }

        this.stats.deletedTransactions = totalDeleted;
        console.log(
            `Completed transaction deletion: ${totalDeleted} total transactions deleted`,
        );
    }

    private async verifyTokensToDelete(
        tokensToDelete: string[],
    ): Promise<void> {
        console.log("Performing safety verification...");

        // Sample a few tokens to verify they don't have recent activity
        const sampleSize = Math.min(10, tokensToDelete.length);
        const sampleTokens = tokensToDelete.slice(0, sampleSize);

        const cutoffTimestamp =
            Math.floor(Date.now() / 1000) - RECENT_ACTIVITY_WINDOW_MINUTES * 60;
        const cutoffDate = new Date(
            Date.now() - RECENT_ACTIVITY_WINDOW_MINUTES * 60 * 1000,
        );

        for (const mint of sampleTokens) {
            // Check for recent transactions
            const recentTransactions = await prisma.transactions.findFirst({
                where: {
                    mint: mint,
                    OR: [
                        { timestamp: { gte: cutoffTimestamp } },
                        {
                            AND: [
                                { timestamp: null },
                                { created_at: { gte: cutoffDate } },
                            ],
                        },
                    ],
                },
            });

            if (recentTransactions) {
                console.error(
                    `❌ SAFETY CHECK FAILED: Token ${mint} has recent transactions but was marked for deletion!`,
                );
                throw new Error(
                    `Safety check failed: Token ${mint} has recent activity but was marked for deletion`,
                );
            }

            // Check for sniper orders
            const sniperOrder = await prisma.sniperOrders.findFirst({
                where: { mint: mint },
            });

            if (sniperOrder) {
                console.error(
                    `❌ SAFETY CHECK FAILED: Token ${mint} has sniper orders but was marked for deletion!`,
                );
                throw new Error(
                    `Safety check failed: Token ${mint} has sniper orders but was marked for deletion`,
                );
            }
        }

        console.log(
            `✅ Safety verification passed for ${sampleSize} sample tokens`,
        );
    }

    private async deleteRelatedRecords(mints: string[]): Promise<void> {
        console.log("Starting deletion of related records...");

        // Delete transactions first (largest table)
        await this.deleteTransactions(mints);

        // Delete other related records
        const deletionTasks = [
            {
                name: "hot_monitoring",
                operation: async (batch: string[]) =>
                    prisma.hot_monitoring.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedHotMonitoring" as keyof CleanupStats,
            },
            {
                name: "hotTokens",
                operation: async (batch: string[]) =>
                    prisma.hotTokens.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedHotTokens" as keyof CleanupStats,
            },
            {
                name: "pump_tokens",
                operation: async (batch: string[]) =>
                    prisma.pump_tokens.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedPumpTokens" as keyof CleanupStats,
            },
            {
                name: "pumpswap_tokens",
                operation: async (batch: string[]) =>
                    prisma.pumpswapTokens.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedPumpswapTokens" as keyof CleanupStats,
            },
            {
                name: "raydium_tokens",
                operation: async (batch: string[]) =>
                    prisma.raydium_tokens.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedRaydiumTokens" as keyof CleanupStats,
            },
            {
                name: "rug_score",
                operation: async (batch: string[]) =>
                    prisma.rug_score.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedRugCheck" as keyof CleanupStats,
            },
            {
                name: "tokenPools",
                operation: async (batch: string[]) =>
                    prisma.tokenPools.deleteMany({
                        where: { mint: { in: batch } },
                    }),
                statKey: "deletedTokenPools" as keyof CleanupStats,
            },
        ];

        for (const task of deletionTasks) {
            const deleted = await this.deleteInBatches(
                task.name,
                task.operation,
                mints,
            );
            (this.stats[task.statKey] as number) = deleted;
        }
    }

    private async deleteTokens(mints: string[]): Promise<void> {
        console.log("Deleting tokens...");

        const deleted = await this.deleteInBatches(
            "tokens",
            async (batch: string[]) =>
                prisma.tokens.deleteMany({ where: { mint: { in: batch } } }),
            mints,
        );
        const deletedPools = await this.deleteInBatches(
            "pools",
            async (batch: string[]) =>
                prisma.pools.deleteMany({ where: { mint: { in: batch } } }),
            mints,
        );

        this.stats.deletedTokens = deleted;
    }

    private async deleteRedisData(mints: string[]): Promise<void> {
        console.log("Deleting Redis data...");

        let deletedHolders = 0;
        let deletedFromTokensSet = 0;

        // Process mints in batches for Redis operations
        for (let i = 0; i < mints.length; i += REDIS_BATCH_SIZE) {
            const batch = mints.slice(i, i + REDIS_BATCH_SIZE);

            try {
                // Use pipeline for better performance
                const pipeline = redis.multi();

                // Delete holders sorted sets and remove from tokens set
                for (const mint of batch) {
                    pipeline.del(`holders:${mint}`);
                    pipeline.hDel("tokens", mint);
                }

                const results = await pipeline.exec();

                // Count successful operations
                if (results) {
                    for (let j = 0; j < results.length; j += 2) {
                        const holdersResult: any = results[j];
                        const tokensResult: any = results[j + 1];

                        if (holdersResult && holdersResult[0] === null) {
                            deletedHolders +=
                                (holdersResult[1] as number) > 0 ? 1 : 0;
                        }
                        if (tokensResult && tokensResult[0] === null) {
                            deletedFromTokensSet += tokensResult[1] as number;
                        }
                    }
                }

                this.stats.deletedRedisHolders = deletedHolders;
                this.stats.deletedFromTokensSet = deletedFromTokensSet;

                await this.logProgress(
                    `Redis: Processed ${Math.min(i + REDIS_BATCH_SIZE, mints.length)}/${mints.length} mints`,
                );

                await this.delay(50); // Short delay for Redis
            } catch (error) {
                console.error(`Error deleting Redis data for batch:`, error);
                // Continue with next batch
            }
        }

        console.log(
            `Redis cleanup completed: ${deletedHolders} holder sets deleted, ${deletedFromTokensSet} tokens removed from set`,
        );
    }

    async cleanup(): Promise<void> {
        try {
            console.log("Starting token cleanup process...");
            const startTime = Date.now();

            // Connect to Redis
            await redis.connect();

            // Get tokens to delete
            const tokensToDelete = await this.getTokensToDelete();

            if (tokensToDelete.length === 0) {
                console.log("No tokens to delete!");
                return;
            }

            // Perform safety verification
            await this.verifyTokensToDelete(tokensToDelete);

            // Delete related records first
            await this.deleteRelatedRecords(tokensToDelete);

            // Delete Redis data
            await this.deleteRedisData(tokensToDelete);

            // Finally delete the tokens
            await this.deleteTokens(tokensToDelete);

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000 / 60; // minutes

            console.log("Cleanup completed!");
            console.log(`Total execution time: ${duration.toFixed(2)} minutes`);
            await this.logProgress("Final stats:", true);

            // Store final results
            await redis.set(
                "token_cleanup_final",
                JSON.stringify({
                    ...this.stats,
                    executionTimeMinutes: duration,
                    completedAt: new Date().toISOString(),
                }),
            );
        } catch (error) {
            console.error("Fatal error during cleanup:", error);
            throw error;
        } finally {
            await redis.disconnect();
            await prisma.$disconnect();
        }
    }
}

// Graceful shutdown handling
process.on("SIGINT", async () => {
    console.log("Received SIGINT, shutting down gracefully...");
    try {
        await redis.disconnect();
    } catch (error) {
        console.error("Error disconnecting Redis:", error);
    }
    try {
        await prisma.$disconnect();
    } catch (error) {
        console.error("Error disconnecting Prisma:", error);
    }
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, shutting down gracefully...");
    try {
        await redis.disconnect();
    } catch (error) {
        console.error("Error disconnecting Redis:", error);
    }
    try {
        await prisma.$disconnect();
    } catch (error) {
        console.error("Error disconnecting Prisma:", error);
    }
    process.exit(0);
});

// Main execution
async function main() {
    const cleanup = new TokenCleanupService();
    await cleanup.cleanup();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });
}

export { TokenCleanupService };
