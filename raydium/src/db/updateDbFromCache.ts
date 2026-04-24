import { PrismaClient } from "@prisma/client";
import getRedisClient, { RedisCache } from "../redis/store";
import { validateTokenObject } from "../utils/getCreateObject";
import prisma from "../prisma/prisma";

export async function updateDb() {
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
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
        })
      );
    }
    console.log("🌙 updated db");
  }
// }


export async function updateToken(){
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
  // const prisma = new PrismaClient();
  // await prisma.$connect()
  const cacheSnap = await tokenMap.getAllTokens()
    console.log(`updating ${cacheSnap.length} records from cache`);
    if(cacheSnap.length > 0){
      for (let i = 0; i < cacheSnap.length; i += 5) {
        const chunk = cacheSnap.slice(i, i + 5);
        await Promise.all(
          chunk.map(async (token) => {
            try {
            // console.log(token)
            // Before updating, check if token already exists
            const alreadyExists = await prisma.tokens.findUnique({where:{mint:token.mint}});
            if(!alreadyExists)
              return;
            await prisma.tokens.update({
              where: { mint: token.mint },
              data: {
                creator_equity: token.creator_equity ?? 0,
                creator_balance: token.creator_balance ?? 1,
                market_cap: token.market_cap ?? 0,
                sol_volume:parseFloat(token.sol_volume ?? 0),
                token_volume: parseFloat(token.token_volume ?? 0),
                buy_count: parseFloat(token.buy_count ?? 0),
                sell_count: parseFloat(token.sell_count ?? 0),
                total_tx: parseFloat(token.total_tx ?? 0),
                total_holders: parseFloat(token.total_holders ?? 0),
                top_10_holder_equity: parseFloat(token.top_10_holder_equity ?? 0),
              },
            }).catch(async(error:any)=>{
              // await prisma.$disconnect()
              console.log("error updating token", error.message)
              // await tokenMap.deletePumpToken(token.mint)
            });
          } catch (error: any) {
    // await prisma.$disconnect()        

            console.log(`error updating ${token.mint} in token`, error.message);
          }
        })
      );
    }
    console.log("🌙 updated db token");
    // await prisma.$disconnect()
  }
}

export async function updatePumpFun(){
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
  // const prisma = new PrismaClient();
  // await prisma.$connect()
  // while (true) {
    const cacheSnap = await tokenMap.getAllPump();
    console.log(typeof cacheSnap[0])
    console.log(`updating ${cacheSnap.length} records from cache`);
    if(cacheSnap.length > 0){
    for (let i = 0; i < cacheSnap.length; i += 5) {
      const chunk = cacheSnap.slice(i, i + 5);
      await Promise.all(
        chunk.map(async (token) => {
          try {
            await prisma.pump_tokens.update({
              where: { mint: token.mint },
              data: {
                bonding_progress: parseFloat(token.rest.bondingProgress ?? token.rest.bonding_progress),
                reserve_sol:parseFloat(token.rest.reserveSol ?? token.rest.reserve_sol),
                reserve_token:parseFloat(token.rest.reserveToken ?? token.rest.reserve_token),
                buy_count: parseFloat(token.rest.buyCount ?? token.rest.buy_count),
                sell_count: parseFloat(token.rest.sellCount ?? token.rest.sell_count),
                updated_at: token.rest.updated_at
              },
            }).catch(async()=>{
              await tokenMap.deletePumpToken(token.mint)
            });
          } catch (error: any) {
            console.log(`error updating ${token.mint} in pumpFun`, error.message);
          }
        })
      );
    }
    console.log("🌙 updated db pump");
    // await prisma.$disconnect()
  }
  // }
}


process.on("message", async () => {
  // await updateDb();
  console.log(process.pid, "process Pid")
  await updateToken()
  await updatePumpFun()
  process.exit(0)
});
