import { createClient, RedisClientType } from "redis";

class TrendingStore {
    private client: RedisClientType;
    private trendingUpdatesChannel: string = "trending-updates-new";
    constructor() {
        this.client = createClient({
            url:
                process.env.REDIS_URL ??
                "redis://default:redisLamboRadar@46.4.21.252:6379/0",
        });
    }
    async connect() {
        await this.client.connect();
    }
    async disconnect() {
        this.client.disconnect();
    }
}

// let trendingTokensCache: TrendingStore | null = null;

// export async function getTrendingTokensStore(): Promise<TrendingStore> {
//     if (!trendingTokensCache) {
//         const trendingTokensCache = new TrendingStore();
//         await trendingTokensCache.connect();
//     }
//     return trendingTokensCache;
// }
