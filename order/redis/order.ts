import { createClient } from "redis";
import type { sniperOrderRedis } from "./cache.type";
export class OrderStore {
    private client;
    private orderKey: string = "sniper";
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
    async addOrder(data: sniperOrderRedis): Promise<void> {
        try {
            const existingOrdersStr = await this.client.hGet(
                this.orderKey,
                data.mint.toString(),
            );
            let orders: sniperOrderRedis[] = existingOrdersStr
                ? JSON.parse(existingOrdersStr)
                : [];

            // Add new order to array
            orders.push(data);

            // Save updated array
            await this.client.hSet(
                this.orderKey,
                data.mint.toString(),
                JSON.stringify(orders),
            );
        } catch (error: any) {
            console.log(`Error adding sniper order to redis: ${error.message}`);
        }
    }
    async readOrdersForMint(mint: string): Promise<sniperOrderRedis[] | null> {
        try {
            const ordersString = await this.client.hGet(
                this.orderKey,
                mint.toString(),
            );
            if (!ordersString) {
                return null;
            }
            const orders: sniperOrderRedis[] = JSON.parse(ordersString);
            return orders;
        } catch (error: any) {
            console.log(`Error getting orders for ${mint}`, error.message);
            return null;
        }
    }
    async deleteOrder(
        mint: string,
        userId: number,
        strategyId: number,
    ): Promise<boolean> {
        try {
            const ordersString = await this.client.hGet(
                this.orderKey,
                mint.toString(),
            );
            if (!ordersString) {
                console.log(`No sniper orders found for mint ${mint}`);
                return false;
            }

            let orders: sniperOrderRedis[] = JSON.parse(ordersString);
            const initialLength = orders.length;

            // Filter out the order with matching userId
            orders = orders.filter(
                (order) =>
                    order.userId !== userId && strategyId !== order.strategyId,
            );

            if (orders.length === 0) {
                // Remove the entire key if no orders left
                await this.client.hDel(this.orderKey, mint.toString());
            } else if (orders.length < initialLength) {
                // Update with remaining orders
                await this.client.hSet(
                    this.orderKey,
                    mint.toString(),
                    JSON.stringify(orders),
                );
            } else {
                // No matching order found
                return false;
            }

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
        ordersStore = new OrderStore();
        await ordersStore.connect();
    }
    return ordersStore;
}

export default getOrdersStore;
