import { createClient } from "redis";
import { sniperOrder } from "../types";
export class SniperStore {
    private client;
    private solanaKey: string = "solana";
    private sniperKey: string = "sniper";
    private sniperProcessLock: string = "sniperProcess";

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
    async getSolPrice(): Promise<number> {
        const data = await this.client.hGet(this.solanaKey, "solPrice");
        return data ? parseFloat(data) : 199.69;
    }

    async addSniperOrder(data: sniperOrder): Promise<void> {
        try {
            const existingOrdersStr = await this.client.hGet(
                this.sniperKey,
                data.mint.toString(),
            );
            let orders: sniperOrder[] = existingOrdersStr
                ? JSON.parse(existingOrdersStr)
                : [];

            // Add new order to array
            orders.push(data);

            // Save updated array
            await this.client.hSet(
                this.sniperKey,
                data.mint.toString(),
                JSON.stringify(orders),
            );
        } catch (error: any) {
            console.log(`Error adding sniper order to redis: ${error.message}`);
        }
    }

    async readSniperOrder(mint: string): Promise<sniperOrder[] | null> {
        try {
            const ordersString = await this.client.hGet(
                this.sniperKey,
                mint.toString(),
            );
            if (!ordersString) {
                // console.log(`No sniper orders found for mint`);
                return null;
            }
            const orders: sniperOrder[] = JSON.parse(ordersString);
            return orders;
        } catch (error: any) {
            console.log(`Error getting orders for ${mint}`, error.message);
            return null;
        }
    }

    async placeSniperDbAddProcessLock(
        mint: string,
        userId: string,
        strategyId: string,
    ) {
        await this.client.hSet(
            this.sniperProcessLock,
            `db:${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
            "locked",
        );
    }

    async removeSniperDbAddProcessLock(
        mint: string,
        userId: string,
        strategyId: string,
    ) {
        await this.client.hDel(
            this.sniperProcessLock,
            `db:${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
        );
    }

    async canSpawnNewDbAddSniperProcess(
        mint: string,
        userId: string,
        strategyId: string,
    ): Promise<boolean> {
        const process = await this.client.hGet(
            this.sniperProcessLock,
            `db:${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
        );
        if (process) {
            return false;
        }
        return true;
    }
}

let sniperStore: SniperStore | null = null;

async function getSniperStore() {
    if (!sniperStore) {
        sniperStore = new SniperStore();
        await sniperStore.connect();
    }
    return sniperStore;
}

export default getSniperStore;
