import { createClient } from "redis";

const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));

export async function redisConnect() {
  const redisClient = await client.connect();
  return redisClient;
}
