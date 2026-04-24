// import getPumpSwapStore from "../redis/pumpswap";
// import prisma from "../prisma/prisma";
// import getRedisClient from "../redis/store";

// export async function updatePumpSwap(){
//     const pumpSwapCache = await getPumpSwapStore()
//     const cacheSnap = await pumpSwapCache.getAllTokens()
//     if(!cacheSnap){
//         return 
//     }
//     console.log(`total pumpswap tokens: ${cacheSnap.length}`)
//     let batches = 0;
//     if(cacheSnap.length > 0){
//         for (let i = 0; i < cacheSnap.length; i += 5) {
//           const chunk = cacheSnap.slice(i, i + 5);
//           await Promise.all(
//             chunk.map(async (token) => {
//               try {
//                 const update = await prisma.pumpswapTokens.update({
//                   where: { mint: token.mint },
//                   data:{
//                      liquidityInSol:token.liquidityInSol,
//                      liquidityInUsd:token.liquidityInUsd,
//                      priceInSol:token.priceInSol,
//                      priceInUsd:token.priceInUsd,
//                      reserveSol:token.reserveSol,
//                      reserveToken:token.reserveToken
//                   }
//             }).then(()=>{
//                 batches++
//               console.log(`updating ${batches}, ${token.mint} record from pumpswap cache`);
//             }).catch(async(error:any)=>{
//               console.log("error updating pump swap batch",token.mint,  error.message)
//               process.exit()
//               await pumpSwapCache.deleteToken(token.mint)
//             });
//             console.log(update)
//         }catch (error: any) {
//           process.exit()
//             console.log(`error updating ${token.mint} in pumpswap`, error.message);
//           }
//         }))
//     }
//     }
// }

// process.on("message", async () => {
//   const tokenMap = await getRedisClient()
// //   const isLocked = await tokenMap.isUpdateLocked()
// //   if(!isLocked){
// //     process.exit(0)
// //   }
// //   await tokenMap.lockUpdateProcess()
//   console.log(process.pid, "process Pid raydium")
//   await updatePumpSwap()
// //   await tokenMap.unlockUpdateProcess()
//   // await tokenMap.disconnect()
//   await prisma.$disconnect()
//   process.exit(0)
// });

// process.on('SIGINT', async () => {
//   await prisma.$disconnect()
//   process.exit(0)
// })

// process.on('SIGTERM', async () => {
//   await prisma.$disconnect()
//   process.exit(0)
// })

import getPumpSwapStore from "../redis/pumpswap";
import prisma from "../prisma/prisma";
import getRedisClient from "../redis/store";

export async function updatePumpSwap() {
  try {
    const pumpSwapCache = await getPumpSwapStore();
    const cacheSnap = await pumpSwapCache.getAllTokens();
    
    if (!cacheSnap || cacheSnap.length === 0) {
      console.log("No tokens found in cache");
      return;
    }
    
    console.log(`total pumpswap tokens: ${cacheSnap.length}`);
    let successCount = 0;
    let failedCount = 0;
    
    // Process in chunks of 5
    for (let i = 0; i < cacheSnap.length; i += 5) {
      const chunk = cacheSnap.slice(i, i + 5);
      
      // Using Promise.all correctly
      const results = await Promise.all(
        chunk.map(async (token) => {
          try {
            // Store the result directly
            const updateResult = await prisma.pumpswapTokens.update({
              where: { mint: token.mint },
              data: {
                liquidityInSol: token.liquidityInSol,
                liquidityInUsd: token.liquidityInUsd,
                priceInSol: token.priceInSol,
                priceInUsd: token.priceInUsd,
                reserveSol: token.reserveSol,
                reserveToken: token.reserveToken
              }
            });
            // console.log(updateResult)
            successCount++;
            // console.log(`Updated ${successCount}: ${token.mint} record from pumpswap cache`);
            
            // Return the result for inspection
            return { success: true, mint: token.mint, result: updateResult };
          } catch (error:any) {
            failedCount++;
            console.error(`Error updating ${token.mint} in pumpswap: ${error.message}`);
            
            // Don't exit process on error, just log and continue
            if (error.code === 'P2025') {
              console.log(`Record not found for ${token.mint}, might need to create instead of update`);
              // Optionally try to create the record instead
              // await pumpSwapCache.deleteToken(token.mint);
            }
            
            return { success: false, mint: token.mint, error: error.message };
          }
        })
      );
      
      // Log the results of this batch
      // console.log(`Batch processed: ${i} to ${i + chunk.length}. Results:`, 
      //             results.map(r => `${r.mint}: ${r.success ? 'success' : 'failed'}`).join(', '));
    }
    
    console.log(`Update completed. Success: ${successCount}, Failed: ${failedCount}`);
    return { successCount, failedCount };
  } catch (error) {
    console.error("Fatal error in updatePumpSwap:", error);
    throw error; // Re-throw the error but don't exit the process
  }
}

process.on("message", async () => {
  try {
    const tokenMap = await getRedisClient();
    console.log(process.pid, "process Pid raydium");
    
    const updateResult = await updatePumpSwap();
    console.log("Update result:", updateResult);
    
    // await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error in main process:", error);
    // await prisma.$disconnect();
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  // await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  // await prisma.$disconnect();
  process.exit(0);
});