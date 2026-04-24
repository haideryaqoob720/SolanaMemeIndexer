import getGeneralPoolStore from "../redis/generalPools";
import prisma from "../prisma/prisma";

export async function updatePools() {
    const poolsCache = await getGeneralPoolStore();
    const cacheSnap = await poolsCache.getAllPools();
    if (!cacheSnap || cacheSnap.length === 0) {
        console.log("No tokens found in cache");
        return;
    }
    console.log(`total pools: ${cacheSnap.length}`);
    let successCount = 0;
    let failedCount = 0;
    try {
        // Process in chunks of 5
        for (let i = 0; i < cacheSnap.length; i += 5) {
            const chunk = cacheSnap.slice(i, i + 5);

            // Using Promise.all correctly
            const results = await Promise.all(
                chunk.map(async (pool) => {
                    try {
                        // Store the result directly
                        const updateResult = await prisma.pools.update({
                            where: { poolAddress: pool.poolAddress },
                            data: {
                                liquidityInSol: pool.liquidityInSol,
                                liquidityInUsd: pool.liquidityInUsd,
                                priceInSol: pool.priceInSol,
                                priceInUsd: pool.priceInUsd,
                                solReserves: pool.solReserves,
                                tokenReserves: pool.tokenReserves,
                            },
                        });
                        // console.log(updateResult)
                        successCount++;
                        // console.log(`Updated ${successCount}: ${token.mint} record from pumpswap cache`);

                        // Return the result for inspection
                        return {
                            success: true,
                            mint: pool.poolAddress,
                            result: updateResult,
                        };
                    } catch (error: any) {
                        failedCount++;
                        console.error(
                            `Error updating ${pool.poolAddress} in pools: ${error.message}`,
                        );

                        // Don't exit process on error, just log and continue
                        if (error.code === "P2025") {
                            console.log(
                                `Record not found for ${pool.poolAddress}, might need to create instead of update`,
                            );
                            // Optionally try to create the record instead
                            // await pumpSwapCache.deleteToken(token.mint);
                        }

                        return {
                            success: false,
                            pool: pool.poolAddress,
                            error: error.message,
                        };
                    }
                }),
            );

            // Log the results of this batch
            // console.log(`Batch processed: ${i} to ${i + chunk.length}. Results:`,
            //             results.map(r => `${r.mint}: ${r.success ? 'success' : 'failed'}`).join(', '));
        }

        console.log(
            `Update completed. Success: ${successCount}, Failed: ${failedCount}`,
        );
        return { successCount, failedCount };
    } catch (error) {
        console.error("Fatal error in updatePools:", error);
        throw error; // Re-throw the error but don't exit the process
    }
}
