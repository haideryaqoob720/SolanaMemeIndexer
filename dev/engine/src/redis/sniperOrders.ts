import { createClient, RedisClientType } from "redis";
import { sniperOrderTest } from "./types";
import getRedisClient from "./store";

export class OrderStore {
    private client;
    private orderKey: string = "sniperOrders";
    private activeOrders: string = "activeOrders";
    constructor(client: RedisClientType) {
        this.client = client;
    }
    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.disconnect();
    }
    private getOrderKey(
        mint: string,
        userId?: number,
        strategyId?: number,
    ): string {
        // return `${this.orderKey}:${mint}:${userId ?? "*"}:${strategyId ?? "*"}`;
        return `${this.orderKey}:${mint}`;
    }

    async addOrder(data: sniperOrderTest): Promise<void> {
        try {
            const newOrder = await this.client.hSet(
                this.getOrderKey(data.mint, data.userId, data.strategyId),
                `${data.userId}:${data.strategyId}`,
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log(`Error adding sniper order to redis: ${error.message}`);
        }
    }
    async readOrdersForMint(mint: string): Promise<sniperOrderTest[] | null> {
        try {
            const key = this.getOrderKey(mint);
            const ordersHash = await this.client.hGetAll(key);

            if (Object.keys(ordersHash).length === 0) {
                return null;
            }

            const orders = Object.values(ordersHash)
                .map((orderString) => {
                    try {
                        return JSON.parse(orderString);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);

            return orders.length > 0 ? orders : null;
        } catch (error: any) {
            console.log(`Error getting orders for ${mint}`, error.message);
            return null;
        }
    }
    async readOneOrder(
        mint: string,
        userId: number,
        strategyId: number,
    ): Promise<sniperOrderTest | null> {
        try {
            const data = await this.client.hGet(
                this.getOrderKey(mint),
                `${userId}:${strategyId}`,
            );
            if (!data) {
                console.log(
                    `order not found for ${mint}:${userId}:${strategyId}`,
                );
                return null;
            }
            return JSON.parse(data);
        } catch (error: any) {
            console.log(`error getting order for ${mint}`, error.message);
            return null;
        }
    }
    async deleteOrder(
        mint: string,
        userId: number,
        strategyId: number,
    ): Promise<boolean> {
        try {
            const data = await this.client.hDel(
                this.getOrderKey(mint),
                `${userId}:${strategyId}`,
            );
            return true;
        } catch (error: any) {
            console.log(
                `Error deleting order for ${mint} and user ${userId}:`,
                error.message,
            );
            return false;
        }
    }

    async addActiveOrder(mint: string, userId: string, strategyId: string) {
        await this.client.hSet(
            this.activeOrders,
            `${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
            "active",
        );
    }
    async removeActiveOrder(mint: string, userId: string, strategyId: string) {
        await this.client.hDel(
            this.activeOrders,
            `${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
        );
    }
    async getActiveOrder(
        mint: string,
        userId: string,
        strategyId: string,
    ): Promise<any | null> {
        const order = await this.client.hGet(
            this.activeOrders,
            `${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
        );
        return order ? JSON.parse(order) : null;
    }
}
let ordersStore: OrderStore | null = null;
async function getOrdersStore(): Promise<OrderStore> {
    if (!ordersStore) {
        const tokenMap = await getRedisClient();
        const client: any = tokenMap.getClient();
        ordersStore = new OrderStore(client);
        // await ordersStore.connect();
    }
    return ordersStore;
}

export default getOrdersStore;
