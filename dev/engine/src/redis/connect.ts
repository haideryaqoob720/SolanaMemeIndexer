import { createClient } from "redis";

const client = createClient({url:"redis://default:redisLamboRadarDev@136.243.172.118:6379/0"});

client.on("error", (err) => console.log("Redis Client Error Connect", err));

export async function redisConnect() {
  const redisClient = await client.connect();
  return redisClient;
}
