import getRedisClient, { RedisCache } from "../redis/store";
import { getAllMetrics } from "../filters/filters";
import { addToken, createPumpToken, createToken } from "../db/addToken";
import { tokenInitialMetrics } from "../filters/basic/getInitialMetrics";
import { getInitialPumpMetrics } from "../filters/pumpFilters/initialFilters";
import { rugCheck } from "../filters/basic/rugCheck";
import { addRugCheck } from "../db/addRugCheck";

export async function handleCreate(
  mint: string,
  creator: string,
  name: string,
  symbol: string,
  uri: string,
  bondingCurve: string
) {
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
  let metrics = await tokenInitialMetrics(mint, creator, name, symbol, uri);
  // console.log("Token data to be saved to database...");
  // console.log(metrics);
  let dbResponse: any = await createToken(metrics);
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
  await tokenMap.create(mint, dbResponse, 0);
  await tokenMap.create(mint, dbPumpRes, 1);
  await tokenMap.disconnect();
}

const [mint, creator, name, symbol, uri, bondingCurve] = process.argv.slice(2);
process.on("message", async () => {
  await handleCreate(mint, creator, name, symbol, uri, bondingCurve);
  process.exit();
});
