import prisma from "../prisma/prisma";
import getPumpSwapStore from "../redis/pumpswap";
import getRedisClient from "../redis/store";
export async function deleteFromRedis() {
    const tokenMap = await getRedisClient();
    const pumpSwapCache = await getPumpSwapStore();
    const dbRes = await prisma.tokens.findMany();
    const dbTokens = new Set(dbRes.map((token) => token.mint));
    const redisTokens = await tokenMap.getAllTokens();
    const inActive = redisTokens.filter(
        (token: any) => !dbTokens.has(token.mint),
    );
    // const allMintsHolders = await tokenMap.getHoldersForAllMints()
    // const active = allMintsHolders.filter((token:any)=> dbTokens.has(token.mint))
    // console.log(allMintsHolders, allMintsHolders.length)
    console.log(dbRes.length, redisTokens.length, inActive.length);
    // const mints:string[] = inActive.map(token=>token.mint)
    // await Promise.all(
    //     inActive.map(async(token)=>{
    //         await tokenMap.deleteHoldersForToken(token.mint)
    //         await tokenMap.deleteTestSniperOrder(token.mint, 35, 35)
    //         await pumpSwapCache.deleteToken(token.mint)
    //         await tokenMap.deleteToken(token.mint)
    //         console.log(`deleted data for ${token.mint}`)
    //     })
    // )
    // await tokenMap.deleteManyRaydium(mints)
    // await tokenMap.deleteManyPump(mints)
}
