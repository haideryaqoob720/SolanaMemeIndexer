import { RedisCache } from "../redis/store";
import { getAllMetrics } from "../filters/filters";
import { addToken, createPumpToken, createToken } from "../db/addToken";
import { tokenInitialMetrics } from "../filters/basic/getInitialMetrics";
import { getInitialPumpMetrics } from "../filters/pumpFilters/initialFilters";
import { rugCheck } from "../filters/basic/rugCheck";
import { addRugCheck } from "../db/addRugCheck";
// import tokenCache from "../redis/tokenStore";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import getRedisClient from "../redis/store"


export async function handleCreate(
  mint: string,
  creator: string,
  name: string,
  symbol: string,
  uri: string,
  bondingCurve: string,
  tokenMap: RedisCache,
) {
  let metrics = await tokenInitialMetrics(mint, creator, name, symbol, uri);
  let dbResponse: any = await createToken(metrics);
  // console.log("Token data to be saved to database...");
  // console.log(metrics);
  let pumpMetrics = await getInitialPumpMetrics(mint, bondingCurve);
  let dbPumpRes = await createPumpToken(pumpMetrics, mint);
  if (dbResponse.socials.length > 0) {
    const rugData = await rugCheck(
      mint,
      name,
      symbol,
      dbResponse.socials,
      dbResponse.mintable ?? false,
      dbResponse.freezeable ?? false,
      dbResponse.creator_equity ?? 2,
      dbResponse.top_10_holder_equity ?? 3
    );
    await addRugCheck(rugData, mint); // some problem when creating the relation
  }
  const reserve_sol = dbPumpRes?.reserve_sol;
  const reserve_token = dbPumpRes?.reserve_token;
  //Adding reserve_sol and reserve_token to cache
  await tokenMap.create(mint, {...dbResponse, reserve_sol, reserve_token}, 0);
  // await tokenCache.create(mint, dbResponse, 0)
  await tokenMap.create(mint, dbPumpRes, 1);

  // await tokenMap.create(mint, metrics, 0);
  // await tokenMap.create(mint, pumpMetrics, 1);
  await tokenMap.addNewTokenToStream(mint, metrics)
  // await tokenMap.disconnect();
}

const [mint, creator, name, symbol, uri, bondingCurve] = process.argv.slice(2);
process.on("message", async () => {
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
      const tokenMap = await getRedisClient()

  // const tokenCache = tokenStore.getInstance();
  try {
    await handleCreate(mint, creator, name, symbol, uri, bondingCurve, tokenMap);
    // await tokenMap.disconnect();
    // await tokenCache.disconnect();
    process.exit();
  } catch (error) {
    process.exit(1)
  }
});
process.on('SIGINT', ()=>{console.log('SIGINT received, exiting...')});
process.on('SIGTERM', ()=>{console.log('SIGTERM received, exiting...')});
