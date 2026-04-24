import { redisConnect } from "./connect";
import { RedisCache } from "./store";

const redis = new RedisCache();
export async function testRedis() {
  // await redis.connect();
  // const res = await redis.testCreate();
  // console.log(res, "res");
  // const test = await redis.testRead();
  // console.log(test, "mint");
}

export async function get() {
  await redis.connect();
}
