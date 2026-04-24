import getRedisClient, { RedisCache } from "../../redis/store";
import { getTokenHolders } from "../holders";

export async function getHolderData() {
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
  const cacheData = await tokenMap.getAll();
  //   const batches = splitIntoBatches(cacheData);
  //   cacheData.map(async (token, index) => {
  //     console.log("started", index);
  //     if (token.creator && token.mint) {
  //       const { totalHolders, top10Equity, creatorEquity } =
  //         await getTokenHolders(token.mint, token.creator);
  //       token.totalHolders = totalHolders;
  //       token.top10holderEquity = top10Equity;
  //       token.creatorEquity = creatorEquity;
  //     }
  //     console.log("ended");
  //   });
  let i: number = 0;
  while (i < cacheData.length) {
    // console.log(i);
    if (cacheData[i].creator && cacheData[i].mint) {
      const data = await getTokenHolders(
        cacheData[i].mint,
        cacheData[i].creator ?? ""
      );
      if (data) {
        // console.log(data, "holders");
        cacheData[i].totalHolders = data.totalHolders;
        cacheData[i].top10holderEquity = data.top10Equity;
        cacheData[i].creatorEquity = data.creatorEquity;
        i++;
      }
    }
  }
  //   batches.forEach((batch, index) => {
  //     console.log(`processing batch ${index + 1}`);
  //     Promise.all(
  //       batch.map(async (token, index) => {
  //         if (token.creator) {
  //           const { totalHolders, top10Equity, creatorEquity } =
  //             await getTokenHolders(token.mint, token.creator);
  //           token.totalHolders = totalHolders;
  //           token.top10holderEquity = top10Equity;
  //           token.creatorEquity = creatorEquity;
  //         }
  //         tokenMap.update(token.mint, token, true);
  //       })
  //     );
  //   });

  //   for (const [index, batch] of batches.entries()) {
  //     console.log(`processing batch ${index + 1}`);
  //     // await Promise.all(
  //     batch.forEach(async (token, idx) => {
  //       console.log(index, idx);
  //       setTimeout(async () => {
  //         console.log("waiting");

  //         if (token.creator && token.mint) {
  //           const { totalHolders, top10Equity, creatorEquity } =
  //             await getTokenHolders(token.mint, token.creator);
  //           token.totalHolders = totalHolders;
  //           token.top10holderEquity = top10Equity;
  //           token.creatorEquity = creatorEquity;
  //         }
  //       }, 1000);
  //       await tokenMap.update(token.mint, token, true);
  //     });
  //     // );
  //   }
}

function splitIntoBatches<T>(array: T[]): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += 10) {
    batches.push(array.slice(i, i + 10));
    // await getTokenHolders(token.mint, token.creator);
  }
  return batches;
}

process.on("message", async () => {
  console.log("start updating holders in a seperate process");
  await getHolderData();
});
