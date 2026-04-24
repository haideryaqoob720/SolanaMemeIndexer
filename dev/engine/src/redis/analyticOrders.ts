import getRedisClient from "./store";
import { RedisClientType } from "redis";

export class AnalyticOrdersStore {
    private key = "order_analytics";
    private client: RedisClientType;

    constructor(client: RedisClientType) {
        this.client = client;
    }

    async createNewAnalyticOrder(mint: string, data: any) {
        try {

            const cacheKey = `${data.orderid}-${mint}-${data.isBuy}`;
            await this.client.hSet(
                this.key,
                cacheKey,
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log(
                "error creating analytic order in cache",
                error.message,
            );
        }
    }

    async getAnalyticOrders(): Promise<any[]> {
        const orders = await this.client.hGetAll(this.key);
        const allAnalyticOrders = Object.entries(orders).map(([mint, data]) => {
            try {
                const parsedValue = JSON.parse(data);
                // Create analytic order object with type conversion
                const analyticOrder = {
                    orderid: parsedValue.orderid,
                    mint: mint.split("-")[1],
                    creator_equity: parseFloat(parsedValue.creator_equity),
                    total_supply: parseFloat(parsedValue.total_supply),
                    total_holders: parsedValue.total_holders,
                    market_cap: parseFloat(parsedValue.market_cap),
                    creator_balance: parseFloat(parsedValue.creator_balance),
                    sol_volume: parseFloat(parsedValue.sol_volume),
                    token_volume: parseFloat(parsedValue.token_volume),
                    buy_count: parseFloat(parsedValue.buy_count),
                    sell_count: parseFloat(parsedValue.sell_count),
                    total_tx: parseFloat(parsedValue.total_tx),
                    decimals: parsedValue.decimals,
                    token_volume_bn: String(parsedValue.token_volume_bn ?? 0),
                    sol_volume_bn: String(parsedValue.sol_volume_bn ?? 0),
                    reserve_sol: String(parsedValue.reserve_sol ?? 0),
                    reserve_token: String(parsedValue.reserve_token ?? 0),
                    dex: parsedValue.dex,
                    is_buy: parsedValue.isBuy
                };
                return analyticOrder;
            } catch (error) {
                console.error(
                    `Error processing analytic order with mint ${mint}:`,
                    error,
                );
            }
        });

        return allAnalyticOrders;
    }

    async alreadyExist(mint: string): Promise<boolean> {
        try {
            const exists = await this.client.hExists(this.key, mint);
            return exists;
        } catch (error: any) {
            console.log(
                "error checking if mint exists in cache",
                error.message,
            );
            return false;
        }
    }

    // delete all process orders.
    async deleteProcessedOrders(mints: string[]): Promise<number> {
        try {
            if (mints.length === 0) return 0;

            const deletedCount = await this.client.hDel(this.key, mints);
            return deletedCount;
        } catch (error: any) {
            console.log(
                "error deleting processed orders from cache",
                error.message,
            );
            return 0;
        }
    }

    //to delete on process order
    async deleteProcessedOrder(cacheKey: string): Promise<boolean> {
        try {
            const deletedCount = await this.client.hDel(this.key, cacheKey);
            return deletedCount === 1;
        } catch (error: any) {
            console.log(
                "error deleting processed order from cache",
                error.message,
            );
            return false;
        }
    }

   async length(): Promise<number> {
        return await this.client.hLen(this.key);
    }


    async flushAll(): Promise<boolean> {
        try {
            const deleted = await this.client.del(this.key);
            return deleted === 1;
        } catch (error: any) {
            console.log(
                "error flushing analytic orders from cache",
                error.message,
            );
            return false;
        }
    }
}

let analyticOrdersCache: AnalyticOrdersStore | null = null;

async function getAnalyticOrdersCache() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!analyticOrdersCache) {
        analyticOrdersCache = new AnalyticOrdersStore(client);
    }
    return analyticOrdersCache;
}

export default getAnalyticOrdersCache;
