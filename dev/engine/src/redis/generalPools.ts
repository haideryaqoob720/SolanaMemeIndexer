import { RedisClientType } from "redis";
import getRedisClient from "./store";
import { dexPool } from "../types";

export class PoolsStore {
    private key = "dex_pools";
    private client: RedisClientType;

    constructor(client: RedisClientType) {
        this.client = client;
    }

    async addPool(data: dexPool) {
        try {
            await this.client.hSet(
                this.key,
                data.poolAddress,
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log("error adding general pool", error.message);
        }
    }
    async getPool(poolAddress: string) {
        try {
            const pool = await this.client.hGet(this.key, poolAddress);
            if (!pool) {
                return null;
            }
            return JSON.parse(pool);
        } catch (error: any) {
            console.log("error getting general pool", error.message);
            return null;
        }
    }
    async getAllPools(): Promise<dexPool[] | null> {
        try {
            const data = await this.client.hGetAll(this.key);
            const pools: dexPool[] = Object.entries(data).map(
                ([key, value]) => ({
                    ...JSON.parse(value),
                }),
            );
            return pools;
        } catch (error: any) {
            console.log("error getting dex Pools", error.message);
            return null;
        }
    }
}

let generalPoolCache: PoolsStore | null = null;

async function getGeneralPoolStore() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!generalPoolCache) {
        generalPoolCache = new PoolsStore(client);
    }
    return generalPoolCache;
}

export default getGeneralPoolStore;
