import { PrismaClient } from "@prisma/client";
import getRedisClient, { RedisCache } from "../redis/store";
import prisma from "../prisma/prisma";

async function updateRay(tokenMap:RedisCache){
    
      // const prisma = new PrismaClient();
      // await prisma.$connect()
      // while (true) {
        const cacheSnap = await tokenMap.getAllRayTokens();
        // console.log(typeof cacheSnap[0], cacheSnap[200])

        if(cacheSnap.length > 0){
        for (let i = 0; i < cacheSnap.length; i += 5) {
          const chunk = cacheSnap.slice(i, i + 5);
          await Promise.all(
            chunk.map(async (token) => {
              try {
                await prisma.raydium_tokens.update({
                  where: { mint: token.mint },
                  data:{
                    reserve_sol: Number(token.reserve_sol),
                    reserve_token: Number(token.reserve_token),
                    lp_burn: Number(token.lp_burn),
                    lp_reserve: Number(token.lp_reserve),
                    liquidity_in_sol: Number(token.liquidity_in_sol),
                    price_in_sol: Number(token.price_in_sol),
                    price_in_usd: Number(token.price_in_usd),
                    liquidity_in_usd: Number(token.liquidity_in_usd),
                    is_quote_vault_sol: token.is_quote_vault_sol,
                    updated_at: new Date(token.updated_at) 
                  }
            }).then(()=>{
              // console.log(`updating ${cacheSnap.length} records from raydium cache`);
            }).catch(async()=>{
              // await prisma.$disconnect()
              await tokenMap.deletePumpToken(token.mint)
            });
          } catch (error: any) {
            // await prisma.$disconnect()
            console.log(`error updating ${token.mint} in raydium`, error.message);
          }
        })
      );
    }
    console.log("🌙 updated db raydium");
    // await prisma.$disconnect()
  }
}


process.on("message", async () => {
  // await updateDb();
  // const tokenMap = new RedisCache();
  //     await tokenMap.connect();
  const tokenMap = await getRedisClient()
  // const isLocked = await tokenMap.isUpdateLocked()
  // if(!isLocked){
  //   process.exit(0)
  // }
  // await tokenMap.lockUpdateProcess()
  console.log(process.pid, "process Pid raydium")
  await updateRay(tokenMap)
  // await updatePumpSwap()
  // await tokenMap.unlockUpdateProcess()
  // await tokenMap.disconnect()
  await prisma.$disconnect()
  process.exit(0)
});

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})