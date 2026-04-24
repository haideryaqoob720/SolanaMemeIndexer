import { pumpswapTokens } from "@prisma/client";
import getRedisClient from "./store";
import { RedisClientType } from "redis";

export class pumpSwapStore {
    private key = "pumpswap_tokens";
    private liquidityRemovedKey: string = "pumpswapLiquidityRemoved";
    private client: RedisClientType;

    constructor(client: RedisClientType) {
        this.client = client;
    }

    async createToken(mint: string, data: pumpswapTokens) {
        try {
            await this.client.hSet(
                this.key,
                mint.toString(),
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log(
                "error creating pumpswap token in cache: ",
                error.message,
            );
        }
    }
    async getToken(mint: string): Promise<pumpswapTokens | null> {
        try {
            const data = await this.client.hGet(this.key, mint.toString());
            return data ? JSON.parse(data) : null;
        } catch (error: any) {
            console.log(
                "error getting pumpswap token in cache: ",
                error.message,
            );
            return null;
        }
    }
    async deleteToken(mint: string) {
        try {
            await this.client.hDel(this.key, mint.toString());
        } catch (error: any) {
            console.log(
                "error deleting pumpswap token in cache: ",
                error.message,
            );
        }
    }
    async getAllTokens(): Promise<pumpswapTokens[] | null> {
        try {
            const data = await this.client.hGetAll(this.key);
            const allTokens: pumpswapTokens[] = Object.entries(data).map(
                ([key, value]) => ({
                    ...JSON.parse(value),
                }),
            );
            return allTokens;
        } catch (error: any) {
            console.log("error getting all tokens", error.message);
            return null;
        }
    }
    async addLiquidityRemoved(mint: string) {
        try {
            const data = { removed: true };
            await this.client.hSet(
                this.liquidityRemovedKey,
                mint.toString(),
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log("error adding removed liquidity", error.message);
        }
    }

    async hasLiquidityRemoved(mint: string): Promise<boolean> {
        try {
            const data = await this.client.hGet(
                this.liquidityRemovedKey,
                mint.toString(),
            );
            return data !== null;
        } catch (error: any) {
            console.log("error checking removed liquidity", error.message);
            return false;
        }
    }
}

let pumpSwapCache: pumpSwapStore | null = null;

async function getPumpSwapStore() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!pumpSwapCache) {
        pumpSwapCache = new pumpSwapStore(client);
    }
    return pumpSwapCache;
}

export default getPumpSwapStore;
