import getRedisClient, { RedisCache } from "../redis/store";
import { PrismaClient } from "@prisma/client";
import prisma from "../prisma/prisma";

// const prisma = new PrismaClient();
function createBatches(array: any, batchSize = 1000) {
    return Array.from({ length: Math.ceil(array.length / batchSize) }, (_, i) =>
        array.slice(i * batchSize, (i + 1) * batchSize),
    );
}

async function fixTx() {
    // const tokenMap = new RedisCache();
    // await tokenMap.connect();
    const tokenMap = await getRedisClient();

    let cursor = 0;
    let totalProcessed = 0;

    do {
        // Get a batch from the "transactions" hash using HSCAN with COUNT 1000
        const reply = await tokenMap.getTxBatches(cursor);
        cursor = reply.cursor; // update the cursor for the next iteration
        const flatData = reply.tuples; // flat array: [field1, value1, field2, value2, ...]

        // Convert the flat array into an array of transaction objects.
        const batch = [];
        for (let i = 0; i < flatData.length; i += 1) {
            const field = flatData[i].field;
            const value = flatData[i].value;
            const tx = JSON.parse(value);
            tx.sol_amount = parseFloat(tx.sol_amount);
            tx.token_amount = parseFloat(tx.token_amount);
            const object = {
                sig: field,
                ...tx,
            };
            //   console.log()
            // Assuming the value is a JSON string; parse it.
            // Optionally, you could attach the field (if needed)
            // tx.field = field;
            batch.push(tx);
        }
        // console.log(batch)
        // console.log(`Processing a batch of ${batch.length} transactions.`);
        console.log(`Total transactions processed: ${totalProcessed}`);
        totalProcessed += batch.length;

        // // Process the current batch concurrently.
        // // The function will not fetch the next batch until this one is complete.
        await Promise.all(
            batch.map(async (tx) => {
                try {
                    await prisma.transactions.create({ data: tx });
                    await tokenMap.deleteFromTx(tx.signature);
                } catch (error) {
                    console.log("signature", tx.signature);
                    await tokenMap.deleteFromTx(tx.signature);
                    console.log("error creating tx:", error);
                }
            }),
        );
    } while (cursor !== 0);

    console.log(`Total transactions processed: ${totalProcessed}`);
}

process.title = "tx_add";
process.on("message", async () => {
    console.log(process.pid, "process Pid");
    console.log("tx FIX process started");
    await fixTx();
    process.exit();
});
// process.on("SIGTERM", () => {
//   console.log("error in tx process");
// });
process.on("SIGTERM", async () => {
    // process.send('shutdown');
    console.log("error FIX in process ...................");
    // process.exit(0);
});
