import type { RedisClientType } from "redis";
import { getRedisConnection } from "./redisConnection";

class ActiveOrdersStore {
    private client: RedisClientType;
    private key: string = "activeOrders";
    constructor(client: RedisClientType) {
        this.client = client;
    }
    private getField(
        userId: string | number,
        strategyId: string | number,
        mint: string,
    ): string {
        return `${userId}:${strategyId}:${mint}`;
    }
    async addActiveOrder(
        mint: string,
        userId: string | number,
        strategyId: string | number,
    ) {
        try {
            await this.client.hSet(
                this.key,
                this.getField(userId, strategyId, mint),
                JSON.stringify({ status: "active" }),
            );
        } catch (error: any) {
            console.error("error adding active order", error.message);
        }
    }
    async getActiveOrder(
        mint: string,
        userId: string | number,
        strategyId: string | number,
    ): Promise<boolean> {
        const data = await this.client.hGet(
            this.key,
            this.getField(userId, strategyId, mint),
        );
        return data ? true : false;
    }
    async removeActiveOrder(
        mint: string,
        userId: string | number,
        strategyId: string | number,
    ) {
        try {
            await this.client.hDel(
                this.key,
                this.getField(userId, strategyId, mint),
            );
        } catch (error: any) {
            console.log("error removing active order", error.message);
        }
    }
}

let activeOrdersStore: ActiveOrdersStore | null = null;

export const getActiveOrdersStore = async (): Promise<ActiveOrdersStore> => {
    if (!activeOrdersStore) {
        const connection = await getRedisConnection();
        activeOrdersStore = new ActiveOrdersStore(connection.getClient());
    }
    return activeOrdersStore;
};
