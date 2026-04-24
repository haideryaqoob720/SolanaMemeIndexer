import { createClient, RedisClientOptions } from 'redis';
import { BaseRedisClient } from './redisBase';
import { tokens } from '@prisma/client';


class tokenStore extends BaseRedisClient {
    private static _instance:tokenStore | null = null;
    private tokensKey: string = "tokens";

    private constructor() {
        super("tokenStore")
    }

    public static getInstance(): tokenStore {
    if (!tokenStore._instance) {
      tokenStore._instance = new tokenStore();
    }
    return tokenStore._instance;
  }

  async create(mint:string, data:any, table?:number){
      try {
        await this.client.hSet(
          this.tokensKey,
          mint.toString(),
          JSON.stringify(data)
        );
      } catch (error: any) {
        console.log("error creating token in cache", error.message);
      }
  }
  async readToken(mint: string): Promise<any | null> {
    const data = await this.client.hGet(this.tokensKey, mint.toString());
    return data ? JSON.parse(data) : null;
  }
  async deleteManyTokens(tokens: string[]) {
    await Promise.all(
      tokens.map(async (token, index) => {
        await this.client.hDel(this.tokensKey, token.toString());
      })
    )
      .then(() => {
        console.log(`deleted ${tokens.length} tokens from cache`);
      })
      .catch(() => {
        console.log("failed to delete many tokens");
      });
  }
  async getAllTokens() {
    const data = await this.client.hGetAll(this.tokensKey);
    return Object.values(data).map((value) => JSON.parse(value));
  }
}

const tokenCache = tokenStore.getInstance();
export default tokenCache;
// module.exports = {tokenCache}