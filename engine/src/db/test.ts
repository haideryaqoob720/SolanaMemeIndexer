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

const solLessTokens = [
    "EQs4DEeaSyrhRPM6JPsf2ptLf4EHkcGXB7ybeufxpump",
    "C7heQqfNzdMbUFQwcHkL9FvdwsFsDRBnfwZDDyWYCLTZ",
    "CzHc1ugMNhim5JCJC8ebbp4k14jfrbZx1HNcMyEppump",
    "Hj2PLmpytBzihn2FWtoWcGntCp4LqeVcD3Fg1Anbpump",
    "E6ufBBybH29E42AXnw6VMU6fjFWiMYRS97P16pNRmoon",
    "ECyfEnjvq4Ho9nak5uirfEAaomC4Qw4SWp5Qt72Zpump",
    "HBoNJ5v8g71s2boRivrHnfSB5MVPLDHHyVjruPfhGkvL",
    "58WAscyseSRr23SR3kE8paAfmazScJsRn1TexJtgpump",
    "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    "3RFoRwDZQQuErzUogDCfH3NbmAsdyuBy87qjGmVnpump",
    "3h9qxTziiuyH8vc3RVnZHUiihUVq2y8engyPGuPxpump",
    "h5NciPdMZ5QCB5BYETJMYBMpVx9ZuitR6HcVjyBhood",
    "7XJiwLDrjzxDYdZipnJXzpr1iDTmK55XixSFAa7JgNEL",
    "9VY2rDbtsBmTsBxoRF8hWSEUKGqnoQoe9V6W3JnjNgfm",
    "J3rYdme789g1zAysfbH9oP4zjagvfVM2PX7KJgFDpump",
    "D7Z2fUrxECBh91chmnou8u7E9Yaq7inzzcjg9G1Apump",
    "CmWNC33Hj5BUxmuPy3tAfktY41Mf7wDayiFm2hiNwXej",
    "8ztixkSGb1sdq4cBAA44NRAdkUZBuRz9snquq72Gpump",
    "ANNTWQsQ9J3PeM6dXLjdzwYcSzr51RREWQnjuuCEpump",
    "4qTJV18HH5YUz9KSAdGEnVQuxPkR9c4gDwV7TaMxbonk",
    "BYpJEjZ8YBBWjF66oihbLnipwtmMHnLeJnkp4aBcpump",
    "eL5fUxj2J4CiQsmW85k5FG9DvuQjjUoBHoQBi2Kpump",
    "AtjqR1z3DujjmD4AoELTGSiK3ogYu7ZNKz2MuWcmpump",
    "5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC",
    "HBsbZz9hvxzi3EnCYWLLwvMPWgV4aeC74mEdvTg9bonk",
    "CfVs3waH2Z9TM397qSkaipTDhA9wWgtt8UchZKfwkYiu",
    "4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump",
    "3zGcFLiVtYesdjqphEEHfqWo1bNsnKZ2SDy6AGVapump",
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    "CboMcTUYUcy9E6B3yGdFn6aEsGUnYV6yWeoeukw6pump",
    "DNShHPmXr7xZo7JHdM1Jdza2V7ZYhS6LDW8K1waXpump",
    "7mHCx9iXPJ7EJDbDAUGmej39Kme8cxZfeVi1EAvEpump",
    "4dmQFkCM1WiUhC75UndLkmMtWj78fQJUvfc4xpMLpump",
    "3mNHDX54Y8FXfGAbchwpGQ6Yh16X8nvk3x8Mukjasend",
    "7grRjEKmpU1EAxtAAJTsakoL4S8qo2RCAx3dsPifPfm4",
    "6MQpbiTC2YcogidTmKqMLK82qvE9z5QEm7EP3AEDpump",
    "6qHtAvksH2cSaUjz6euVSikPU8RnDqLpFtuWH6Ropump",
    "Cdq1WR1d4i2hMrqKUWgZeUbRpkhamGHSvm1f6ATpuray",
    "2RA1v8NdkEQcF5N5zHUqLuAHxjnDMQFjwEE8fwKNpump",
    "CGkRYvHnV6guL8DMadWG57qe6qUm6m3zDyGpMrcvpump",
    "joLV7L6YVQQEjT1KUrRuVNJs9kPHVgjv68jEm8Apump",
    "31k88G5Mq7ptbRDf3AM13HAq6wRQHXHikR8hik7wPygk",
    "w1nf7GjwCDNwn4ZsUqPr4a4omu6Zc3boKd83Cpfpump",
    "J9t6qN3t9ZDh2punTLeBfvR5fnszpEbhepAyLxQBYQTB",
    "8w6yhgsGKxfMZRPLNBBjgJQKRRGaXvgDAdhgQacEpump",
    "G2AbNxcyXV6QiXptMm6MuQPBDJYp9AVQHTdWAV1Wpump",
    "3xppG9kV9Y4TGxfAwU2vwW7HhZvKfQnpGMBJv1jipump",
    "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
    "8BtoThi2ZoXnF7QQK1Wjmh2JuBw9FjVvhnGMVZ2vpump",
    "4veK9R9GxmgxqkFhTa2VnE6MJ4YfTxnr92HF5gH5LcAF",
    "mkvXiNBpa8uiSApe5BrhWVJaT87pJFTZxRy7zFapump",
    "WAJmwPfRFnuonu2SHy5YpZTAfwENGVAnECahSZPpump",
    "CZwHBS39MznCFVxkQjp5rTWkgseBZ1MsezcjUkijpump",
    "B9jYrBoCPN7FcXVHe56KXsYgJE5gbTxsadjvyFiVpump",
    "DWVBoShguKgtLrM2sUyVe8kQZTEzwr9DN8TnbtUnpump",
    "5LafQUrVco6o7KMz42eqVEJ9LW31StPyGjeeu5sKoMtA",
    "3hifQKYH6RqkAjBpYeggem1cwu9PG4ToH2eVeML5pump",
    "69LjZUUzxj3Cb3Fxeo1X4QpYEQTboApkhXTysPpbpump",
    "Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs",
    "6mfaa4KbMHfGfXtWmjpkXoNMLsYSPD69qsGtPqbkpump",
    "GJtJuWD9qYcCkrwMBmtY1tpapV1sKfB2zUv9Q4aqpump",
    "ErbWv3W8cgtp6ZRtLKg3aDLu1mDU3vhgTogZqi1Apump",
    "3WPep4ufaToK1aS5s8BL9inzeUrt4DYaQCiic6ZkkC1U",
    "BYZ9CcZGKAXmN2uDsKcQMM9UnZacija4vWcns9Th69xb",
    "8NCievmJCg2d9Vc2TWgz2HkE6ANeSX7kwvdq5AL7pump",
    "4bXCaDUciWA5Qj1zmcZ9ryJsoqv4rahKD4r8zYYsbonk",
    "HeJUFDxfJSzYFUuHLxkMqCgytU31G6mjP4wKviwqpump",
    "Abub8cRJviGWsv1qWjkR1wHqNdYjRenoaZxroFxbpump",
    "GMk6j2defJhS7F194toqmJNFNhAkbDXhYJo5oR3Rpump",
    "Hax9LTgsQkze1YFychnBLtFH8gYbQKtKfWKKg2SP6gdD",
    "6rE8kJHDuskmwj1MmehvwL2i4QXdLmPTYnrxJm6Cpump",
    "HwcFmaNZmAjJyj4aEJuC52QrSpU9gawFhsJeehEwpump",
    "3BtunCQ3KdpsYtXQU9SmkGopnDkaQHuEgG14Dy1Lbonk",
    "7CLBRXBp534WyZfgMDnR3E4VyedeHVPFQe3P1EHDpump",
    "ED1aS2Fr55KMUk8KkH58kK3EJyYz3yZtkVqs4Ysbonk",
    "GP3PP5ycVa49PHD4yBnjKrKgjn8pGgmfkK6oUA26pump",
    "HLL31GKoyZr9ULMbENeHbtpx3RgaUHaH4qGpVHkdbonk",
    "D4JFHFqzysbbb86CYaeFkA5xKVmjgeSpquWUP5NxDjkM",
    "FhNReAp2WrW5ty94jpX6xP95vMEo4Dp8Q98LTNohrno4",
    "FYa25XnBsXQXAdTnsyKBKd5gZ1VZhChBRF57CqfRxJZX",
    "C22sD7SrexSpZmvH5yEaFL8gW8ZwsRr1ctbpP1mzpump",
    "4TrLgXh19LmbMzdN5BdxWAYqXGVBMN5NzPYT2BK7pump",
    "GtDZKAqvMZMnti46ZewMiXCa4oXF4bZxwQPoKzXPFxZn",
    "2MVy9drHqSBinPoSyUrUVS19m5u8Cjj3mZcnpYshpump",
    "4BEZdYPAC5y2THQaPRdQd5oKwZupJ5WVU9FWhym4pump",
    "J9tBGFgTnpkVWPEwtHMwLqxUNFMXQakZXLQUP5y5pump",
    "AFMyfmGLmZ7VGfqbQ3aUaHtNQnH3mE4T1foJyimppump",
    "Et1nwX1U2PrS1A4iRvFcd6LGzYWh1C33iHvKWBCVpump",
    "HobHTXpK1KQf9o46G6hAX3rfyH3x7ovdnaF6p1MEpump",
    "9YnfbEaXPaPmoXnKZFmNH8hzcLyjbRf56MQP7oqGpump",
    "5LS3ips7jWxfuVHzoMzKzp3cCwjH9zmrtYXmYBVGpump",
    "HgeiNcokoR22ZJUxa6XZqtMfB6S8xghWTJD4MFz3pump",
    "Bt9tUAuuoJTihrLvgK1kWErBJduaGEeQbF2VhAPHtYm4",
    "YN4U8xySzuyARUMTNCpMgkkek7nnh2VAkUMdMygpump",
    "BQQzEvYT4knThhkSPBvSKBLg1LEczisWLhx5ydJipump",
    "2ru87k7yAZnDRsnqVpgJYETFgqVApuBcwB2xDb19pump",
    "AU1dQQhLho6M5YuyRvhvofPrQWt3sRiB9FmsXtW3pump",
    "H7jW7hgxJPSpCMQtNtrxdW4R2RUzmAyoRFwAnTVZpump",
    "2vfBxPmHSW2YijUcFCRoMMkAWP9fp8FGWnKxVvJnpump",
    "F83qesR5cuCkc4ZgdeLsTQorHhE4xKHYMV4Uj69Upump",
];

export async function cleanupTokens() {
    try {
        // Get eligible tokens
        const tokensFromdb: any = await prisma.$queryRaw`
      SELECT
        t.mint,
        t.symbol,
        t.name,
        t.total_tx
      FROM tokens t
      LEFT JOIN raydium_tokens rt ON t.mint = rt.mint
      LEFT JOIN pump_tokens pt ON t.mint = pt.mint
      LEFT JOIN pumpswap_tokens pst ON t.mint = pst.mint
      WHERE t.total_tx > 100000
        AND rt.mint IS NULL
        AND pt.mint IS NULL
        AND pst.mint IS NULL
      ORDER BY t.total_tx DESC
    `;

        const tokenDbMints = tokensFromdb.map((token: any) => token.mint);
        const tokenSet = new Set([...solLessTokens, ...tokenDbMints]);
        const tokens: string[] = Array.from(tokenSet);
        console.log(
            `soless:${solLessTokens.length}, db:${tokenDbMints.length}`,
        );
        console.log(`Found ${tokens.length} tokens to cleanup`);
        const rl = createInterface({
            input: stdin,
            output: stdout,
        });
        rl.question("Do you want to proceed? (y/n)\n", async (answer) => {
            if (answer.toLowerCase() === "y") {
                let processed = 0;
                let totalDeleted = 0;

                // Process each token
                for (const mint of tokens) {
                    try {
                        await prisma.$transaction(async (tx) => {
                            // Delete from all related tables
                            const deletions = await Promise.all([
                                tx.hot_monitoring.deleteMany({
                                    where: { mint },
                                }),
                                tx.pump_tokens.deleteMany({ where: { mint } }),
                                tx.raydium_tokens.deleteMany({
                                    where: { mint },
                                }),
                                tx.rug_score.deleteMany({ where: { mint } }),
                                tx.pumpswapTokens.deleteMany({
                                    where: { mint },
                                }),
                                tx.sniperOrders.deleteMany({ where: { mint } }),
                                tx.tokenPools.deleteMany({ where: { mint } }),
                                tx.pools.deleteMany({ where: { mint } }),
                                tx.hotTokens.deleteMany({ where: { mint } }),
                                tx.tokens.deleteMany({ where: { mint } }),
                            ]);

                            const deleted = deletions.reduce(
                                (sum, result) => sum + result.count,
                                0,
                            );
                            totalDeleted += deleted;

                            console.log(
                                `Cleaned up token ${mint}: ${deleted} records deleted`,
                            );
                        });

                        processed++;
                    } catch (error: any) {
                        console.error(
                            `Error cleaning token ${mint}:`,
                            error.message,
                        );
                    }
                }

                console.log(
                    `Cleanup complete: ${processed} tokens processed, ${totalDeleted} total records deleted`,
                );
                return { processed, totalDeleted };
            } else {
                console.log("clean up cancelled");
                return;
            }
        });
    } catch (error) {
        console.error("Cleanup failed:", error);
        throw error;
    } finally {
        // await prisma.$disconnect();
    }
}

export { deleteTransactionsWithNonExistentMints };
