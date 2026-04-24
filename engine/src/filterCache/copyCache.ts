// import { setActiveCache } from "../constants";
const setActiveCache = require("../constants");
const getActiveCache = require("../constants");
import { RedisCache } from "../redis/store";

const Redis = require("ioredis");

async function getCacheVersion(index: number) {
  const redis = new Redis({
    host: "localhost", // Replace with your Redis server's host
    port: 6379, // Replace with your Redis server's port
    db: index, // Select the database index (e.g., 1)
  });
  return redis;
}

let ACTIVE_CACHE = "alpha";
export async function copyCache(databaseIndex: number, key: string) {
  console.log("in test");
  const original = await getCacheVersion(0);
  //   const target = await getCacheVersion(databaseIndex);
  //   const keys = await original.keys("*");
  //   console.log(typeof keys[0]);
  try {
    // if (getActiveCache() === "alpha") {
    if (ACTIVE_CACHE === "alpha") {
      // if active cache is alpha then copy data from alpha to beta and delete the cache. vice versa
      const exists = await original.exists(key);
      console.log(exists, "exist");
      const hashData = await original.hgetall("meme_token_test_alpha");
      await original.hmset("meme_token_test_beta", hashData);
      //   setActiveCache("beta");
      ACTIVE_CACHE = "beta";
      console.log("copied database");
      await original.del("meme_token_test_alpha");
    } else {
      const exists = await original.exists("meme_token_test_alpha");
      console.log(exists, "exist");
      const hashData = await original.hgetall("meme_token_test_beta");
      await original.hmset("meme_token_test_alpha", hashData);
      console.log("copied database");
      await original.del("meme_token_test_beta");
      //   setActiveCache("alpha");
      ACTIVE_CACHE = "alpha";
    }
  } catch (error: any) {
    console.log("error copying redis: ", error.message);
  }
}
