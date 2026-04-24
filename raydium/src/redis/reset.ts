import getRedisClient, { RedisCache } from "./store";

export async function resetCache() {
  // const tokenMap = new RedisCache();
  // await tokenMap.connect();
  const tokenMap = await getRedisClient()
  await tokenMap.reset();
  // console.log("cache reset");
  //   await tokenMap.disconnect();
}
