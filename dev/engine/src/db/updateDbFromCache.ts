import { PrismaClient } from "@prisma/client";
import getRedisClient, { RedisCache } from "../redis/store";
import { validateTokenObject } from "../utils/getCreateObject";
import prisma from "../prisma/prisma";
import { tokenMetadataUpdateField } from "@solana/spl-token";
import tokenCache from "../redis/tokenStore";
import { convertBnToString, convertToBN } from "../utils/helpers";

// const tokenMap = new RedisCache();

export async function updateDb(tokenMap: RedisCache) {
    // const tokenMap = new RedisCache();
    // await tokenMap.connect();
    // const prisma = new PrismaClient();

    // while (true) {
    const cacheSnap = await tokenMap.getAll();
    console.log(`updating ${cacheSnap.length} records from cache`);
    for (let i = 0; i < cacheSnap.length; i += 5) {
        const chunk = cacheSnap.slice(i, i + 5);
        await Promise.all(
            chunk.map(async (token) => {
                try {
                    const data = validateTokenObject(token);
                    await prisma.meme_token_test.update({
                        where: { mint: token.mint },
                        data: data,
                    });
                } catch (error: any) {
                    console.log(`error updating ${token.mint}`, error.message);
                }
            }),
        );
    }
    console.log("🌙 updated db");
}
// }

let errorCount: number = 0;

const top10Correction = (top10: number): number => {
    if (top10 > 100) {
        return 93.42;
    } else if (top10 === 0) {
        return 9.37;
    }
    return top10;
};

export async function updateToken(tokenMap: RedisCache) {
    // const tokenCache = tokenStore.getInstance()
    // const tokenMap = new RedisCache();
    // await tokenMap.connect();
    // const prisma = new PrismaClient();
    // await prisma.$connect()
    const cacheSnap = await tokenMap.getAllTokens();
    // const cacheSnap = await tokenCache.getAllTokens()
    console.log(`updating ${cacheSnap.length} records from cache`);
    if (cacheSnap.length > 0) {
        for (let i = 0; i < cacheSnap.length; i += 5) {
            const chunk = cacheSnap.slice(i, i + 5);
            await Promise.all(
                chunk.map(async (token) => {
                    try {
                        // Before updating, check if token already exists
                        const alreadyExists = await prisma.tokens.findUnique({
                            where: { mint: token.mint },
                        });
                        if (!alreadyExists) {
                            return;
                        }
                        // console.log(token.solVolumeBN, token.tokenVolumeBN, "sol, token, update")

                        // if (!token.top_10_holder_equity) {
                        //     console.log(token.mint, token.top_10_holder_equity);
                        // }
                        // if (!token.top_10_holder_equity) {
                        //     console.log(
                        //         `top10 for ${token.mint}: ${token.top_10_holder_equity}\ncreated at: ${token.created_at} token update process`,
                        //         token,
                        //     );
                        // }
                        await prisma.tokens
                            .update({
                                where: { mint: token.mint },
                                data: {
                                    creator_equity: token.creator_equity ?? 0,
                                    creator_balance: token.creator_balance ?? 1,
                                    market_cap: token.market_cap ?? 0,
                                    // sol_volume:parseFloat(token.sol_volume ?? 0),
                                    // token_volume: parseFloat(parseTokenVolume(String(token.token_volume)) ?? 0),
                                    tokenVolumeBN: token.tokenVolumeBN,
                                    solVolumeBN: token.solVolumeBN,
                                    buy_count: parseFloat(token.buy_count ?? 0),
                                    sell_count: parseFloat(
                                        token.sell_count ?? 0,
                                    ),
                                    total_tx: parseFloat(token.total_tx ?? 0),
                                    total_holders: parseFloat(
                                        token.total_holders ?? 0,
                                    ),
                                    top_10_holder_equity: top10Correction(
                                        parseFloat(
                                            token.top_10_holder_equity ?? 0,
                                        ),
                                    ),
                                },
                            })
                            .catch(async (error: any) => {
                                // await prisma.$disconnect()
                                errorCount++;
                                // console.log(token)
                                console.log(
                                    "error updating token",
                                    error.message,
                                );
                                // await tokenMap.deletePumpToken(token.mint)
                            });
                    } catch (error: any) {
                        // convertBnToString(convertToBN(
                        // await prisma.$disconnect()

                        console.log(
                            `error updating ${token.mint} in token`,
                            error.message,
                        );
                    }
                }),
            );
            // console.log(`updated ${i}/${cacheSnap.length}`)
        }
        console.log(`error in ${errorCount} tokens`);
        console.log("🌙 updated db token");
        // await prisma.$disconnect()
    }
}

//needs to be removed calculation error in migrated token volume
function parseTokenVolume(str: string): string {
    const infinityPattern = /(Infinity)(\d+(?:\.\d+)?)/g;
    return str.replace(infinityPattern, (match, infinity, number) => {
        errorCount++;
        console.log("Found values:", infinity, "and", number);
        return number;
    });
    // if(str.includes("Infinity")){
    //   str = str.replace("Infinity", "")
    // }
    // // console.log(str)
    // return str
}

export async function updatePumpFun(tokenMap: RedisCache) {
    // const tokenMap = new RedisCache();
    // await tokenMap.connect();
    // const prisma = new PrismaClient();
    // await prisma.$connect()
    // while (true) {
    const cacheSnap = await tokenMap.getAllPump();
    console.log(cacheSnap[0]);
    console.log(`updating ${cacheSnap.length} records from cache`);
    if (cacheSnap.length > 0) {
        for (let i = 0; i < cacheSnap.length; i += 5) {
            const chunk = cacheSnap.slice(i, i + 5);
            await Promise.all(
                chunk.map(async (token) => {
                    try {
                        await prisma.pump_tokens
                            .update({
                                where: { mint: token.mint },
                                data: {
                                    bonding_progress: parseFloat(
                                        token.rest.bondingProgress ??
                                            token.rest.bonding_progress,
                                    ),
                                    reserve_sol: parseFloat(
                                        token.rest.reserveSol ??
                                            token.rest.reserve_sol,
                                    ),
                                    reserve_token: parseFloat(
                                        token.rest.reserveToken ??
                                            token.rest.reserve_token,
                                    ),
                                    buy_count: parseFloat(
                                        token.rest.buyCount ??
                                            token.rest.buy_count,
                                    ),
                                    sell_count: parseFloat(
                                        token.rest.sellCount ??
                                            token.rest.sell_count,
                                    ),
                                    updated_at: token.rest.updated_at,
                                },
                            })
                            .catch(async () => {
                                await tokenMap.deletePumpToken(token.mint);
                            });
                    } catch (error: any) {
                        console.log(token, "pumpfun update");
                        console.log(
                            `error updating ${token.mint} in pumpFun`,
                            error.message,
                        );
                    }
                }),
            );
        }
        console.log("🌙 updated db pump");
        // await prisma.$disconnect()
    }
    // }
}

process.on("message", async () => {
    // await updateDb();
    console.log(process.pid, "process Pid");
    const tokenMap = await getRedisClient();
    // await tokenMap.connect()
    await updateToken(tokenMap);
    await updatePumpFun(tokenMap);
    await prisma.$disconnect();
    // await tokenMap.disconnect()
    process.exit(0);
});

process.on("SIGINT", async () => {
    await prisma.$disconnect();
    // await tokenMap.disconnect()
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    // await tokenMap.disconnect()
    process.exit(0);
});
