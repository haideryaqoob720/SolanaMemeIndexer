import { Readline } from "node:readline/promises";
import prisma from "../prisma/prisma";
import getHolderStore from "../redis/holders";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

async function deleteTransactionsWithNonExistentMints(batchSize = 10000) {
    try {
        console.log("Starting batch deletion process...");
        let totalDeleted = 0;
        let continueDeleting = true;

        while (continueDeleting) {
            // Use a more efficient approach with NOT EXISTS
            // Process in batches to avoid memory issues and long-running transactions
            const result = await prisma.$executeRaw`
        DELETE FROM "transactions"
        WHERE "id" IN (
          SELECT "id" FROM "transactions"
          WHERE NOT EXISTS (
            SELECT 1 FROM "tokens" WHERE "tokens"."mint" = "transactions"."mint"
          )
          LIMIT ${batchSize}
        )
      `;

            totalDeleted += Number(result);
            continueDeleting = Number(result) > 0;

            console.log(
                `Deleted batch of ${result} transactions. Total deleted: ${totalDeleted}`,
            );

            // Small pause between batches to reduce database load
            if (continueDeleting) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        console.log(
            `Successfully deleted ${totalDeleted} transactions with non-existent mints`,
        );
        return { count: totalDeleted };
    } catch (error) {
        console.error("Error deleting transactions:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function deleteHoldersFromRedis() {
    const holdersCache = await getHolderStore();
    const mintsFromDb = await prisma.pumpswapTokens.findMany({
        select: {
            mint: true,
        },
    });
    const mintsInDb: string[] = mintsFromDb.map((mint) => mint.mint);
    const mintsInRedis = await holdersCache.getAllMints();
    const mintsInDbSet = new Set(mintsInDb);
    const mintsToDelete = mintsInRedis.filter(
        (mint) => !mintsInDbSet.has(mint),
    );
    const rl = createInterface({
        input: stdin,
        output: stdout,
    });
    console.log(
        `Found ${mintsToDelete.length} mints to delete holders from Redis\n`,
        `${mintsInDb.length} mints in db and ${mintsInRedis.length} in Redis`,
    );

    rl.question("Do you want to proceed? (y/n)\n", async (answer) => {
        if (answer.toLowerCase() === "y") {
            await Promise.all(
                mintsToDelete.map((mint) =>
                    holdersCache.removeHoldersForMint(mint),
                ),
            );
            console.log(`Deleted ${mintsToDelete.length} mints from Redis`);
        } else {
            console.log("\nCleanup cancelled");
        }
        rl.close();
    });
}

export { deleteTransactionsWithNonExistentMints };
