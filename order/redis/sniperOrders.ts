import { createClient } from "redis";
import type { sniperOrderRedis } from "./cache.type";
export class SniperOrderStore {
    private client;
    private orderKey: string = "sniperOrders";
    private sniperProcessLock: string = "sniperProcess";
    private activeOrders: string = "activeOrders";
    constructor() {
        this.client = createClient({
            url:
                process.env.REDIS_URL ??
                "redis://default:redisLamboRadar@46.4.21.252:6379/0",
        });
        this.client.on("error", (err) =>
            console.error("Redis Client Error Main", err),
        );
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

    async addOrder(data: sniperOrderRedis): Promise<void> {
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
    async readOrdersForMint(mint: string): Promise<sniperOrderRedis[] | null> {
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
    ): Promise<sniperOrderRedis | null> {
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
    async removeSniperProcessLock(mint: string, orderId: string) {
        console.log("lock removed");
        await this.client.hDel(
            this.sniperProcessLock,
            `${orderId.toString()}:${mint.toString()}`,
        );
    }
}
let sniperOrdersStore: SniperOrderStore | null = null;
async function getSniperOrdersStore(): Promise<SniperOrderStore> {
    if (!sniperOrdersStore) {
        sniperOrdersStore = new SniperOrderStore();
        await sniperOrdersStore.connect();
    }
    return sniperOrdersStore;
}

export default getSniperOrdersStore;
