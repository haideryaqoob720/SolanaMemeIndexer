const { PrismaClient } = require("@prisma/client");
const ProgressBar = require("progress");

const prisma = new PrismaClient();

async function cleanupOrphanedTransactions() {
    console.log("Starting cleanup of orphaned transactions...");
    const startTime = Date.now();

    try {
        // Step 1: We don't need to fetch all mints anymore since we use EXISTS subquery
        console.log("Starting batch deletion of orphaned transactions...");

        // Step 2: Get count of transactions to be deleted (for progress tracking)
        console.log("Counting transactions to be deleted...");
        const totalToDelete = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM transactions t
      WHERE NOT EXISTS (
        SELECT 1 FROM tokens tk WHERE tk.mint = t.mint
      )
    `;

        const totalCount = parseInt(totalToDelete[0].count);
        console.log(`Found ${totalCount} transactions to delete`);

        if (totalCount === 0) {
            console.log("No orphaned transactions found. Cleanup complete.");
            return { deleted: 0, duration: Date.now() - startTime };
        }

        // Initialize progress bar
        const progressBar = new ProgressBar(
            "Deleting [:bar] :percent :current/:total | ETA: :etas | Rate: :rate/s",
            {
                complete: "█",
                incomplete: "░",
                width: 40,
                total: totalCount,
            },
        );

        // Step 3: Delete in batches using EXISTS subquery to avoid bind variable limit
        const BATCH_SIZE = 10000; // Adjust based on your system's performance
        let totalDeleted = 0;
        let batchCount = 0;

        while (totalDeleted < totalCount) {
            batchCount++;

            // Use EXISTS subquery to avoid bind variable limits
            const deletedCount = await prisma.$executeRaw`
        DELETE FROM transactions
        WHERE id IN (
          SELECT t.id
          FROM transactions t
          WHERE NOT EXISTS (
            SELECT 1 FROM tokens tk WHERE tk.mint = t.mint
          )
          LIMIT ${BATCH_SIZE}
        )
      `;

            totalDeleted += deletedCount;

            // Update progress bar
            progressBar.tick(deletedCount);

            // Small delay to prevent overwhelming the database
            if (deletedCount > 0) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            } else {
                // If no records were deleted, we're done
                break;
            }
        }

        // Ensure progress bar is complete
        if (!progressBar.complete) {
            progressBar.update(totalDeleted);
        }

        const duration = Date.now() - startTime;
        console.log(
            `Cleanup complete! Deleted ${totalDeleted} orphaned transactions in ${duration}ms`,
        );

        return { deleted: totalDeleted, duration };
    } catch (error) {
        console.error("Error during cleanup:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Alternative approach using temporary table (potentially faster for very large datasets)
async function cleanupOrphanedTransactionsWithTempTable() {
    console.log("Starting cleanup using temporary table approach...");
    const startTime = Date.now();

    try {
        // Create temporary table with valid mints
        await prisma.$executeRaw`
      CREATE TEMP TABLE valid_mints AS
      SELECT DISTINCT mint FROM tokens
    `;

        // Create index on temp table for better performance
        await prisma.$executeRaw`
      CREATE INDEX idx_valid_mints ON valid_mints(mint)
    `;

        // Get count of records to delete
        const totalToDelete = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM transactions t
      WHERE NOT EXISTS (
        SELECT 1 FROM valid_mints vm WHERE vm.mint = t.mint
      )
    `;

        console.log(`Found ${totalToDelete[0].count} transactions to delete`);

        // Delete in batches using the temporary table
        const BATCH_SIZE = 10000;
        let totalDeleted = 0;
        let batchCount = 0;

        while (true) {
            batchCount++;

            const deletedCount = await prisma.$executeRaw`
        DELETE FROM transactions
        WHERE id IN (
          SELECT t.id
          FROM transactions t
          WHERE NOT EXISTS (
            SELECT 1 FROM valid_mints vm WHERE vm.mint = t.mint
          )
          LIMIT ${BATCH_SIZE}
        )
      `;

            if (deletedCount === 0) break;

            totalDeleted += deletedCount;
            const progress = (
                (totalDeleted / parseInt(totalToDelete[0].count)) *
                100
            ).toFixed(2);
            console.log(
                `Batch ${batchCount}: Deleted ${deletedCount} records. Progress: ${progress}% (${totalDeleted}/${totalToDelete[0].count})`,
            );

            // Small delay between batches
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const duration = Date.now() - startTime;
        console.log(
            `Cleanup complete! Deleted ${totalDeleted} orphaned transactions in ${duration}ms`,
        );

        return { deleted: totalDeleted, duration };
    } catch (error) {
        console.error("Error during cleanup:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Performance monitoring wrapper
async function cleanupWithMonitoring(useTemporaryTable = false) {
    const cleanup = useTemporaryTable
        ? cleanupOrphanedTransactionsWithTempTable
        : cleanupOrphanedTransactions;

    try {
        const result = await cleanup();

        // Log final statistics
        console.log("\n=== CLEANUP SUMMARY ===");
        console.log(`Records deleted: ${result.deleted.toLocaleString()}`);
        console.log(`Duration: ${(result.duration / 1000).toFixed(2)} seconds`);
        console.log(
            `Average rate: ${(result.deleted / (result.duration / 1000)).toFixed(0)} records/second`,
        );

        return result;
    } catch (error) {
        console.error("Cleanup failed:", error);
        throw error;
    }
}

module.exports = {
    cleanupOrphanedTransactions,
    cleanupOrphanedTransactionsWithTempTable,
    cleanupWithMonitoring,
};

async function main() {
    await cleanupOrphanedTransactions();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });
}
