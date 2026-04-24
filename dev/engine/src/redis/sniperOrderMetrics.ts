import { RedisClientType } from "redis";
import getRedisClient from "./store";
// import { sniperOrderMetrics } from "./types";

interface timeTaken {
    timeMs: number;
    timestamp: string;
}

interface orderTxMetrics {
    eventTriggered: string | null;
    addedToQ: string | null;
    startedProcessing: string | null;
    completed: string | null;
    dbUpdated: string | null;
}

export interface sniperOrderMetrics {
    buy: orderTxMetrics;
    sell: orderTxMetrics;
    isOnChain: boolean;
}

export class OrderMetricsStore {
    private baseKey: string = "orderMetrics";
    private activeOrderMetrics: string = `${this.baseKey}:active`;
    private hourlyOrderMetrics: string = `${this.baseKey}:hourly`;
    private client: RedisClientType;
    constructor(client: RedisClientType) {
        this.client = client;
    }
    private getMetricsField(
        userId: number | string,
        strategyId: string | number,
        mint: string,
    ) {
        return `${userId}:${strategyId}:${mint}`;
    }
    private getHourlyMetricsField(month: number, day: number, hour: number) {
        return `${month}:${day}:${hour}`;
    }
    async addActiveMetrics(
        userId: number | string,
        strategyId: string | number,
        mint: string,
        isOnChain: boolean,
        time: string,
    ) {
        const orderMetrics: sniperOrderMetrics = {
            buy: {
                // eventTriggered: {
                //     timeMs: 0,
                //     timestamp: time,
                // },
                eventTriggered: time,
                addedToQ: null,
                startedProcessing: null,
                completed: null,
                dbUpdated: null,
            },
            sell: {
                eventTriggered: null,
                addedToQ: null,
                startedProcessing: null,
                completed: null,
                dbUpdated: null,
            },
            isOnChain: isOnChain,
        };
        await this.client.hSet(
            this.activeOrderMetrics,
            this.getMetricsField(userId, strategyId, mint),
            JSON.stringify(orderMetrics),
        );
    }

    async updateActiveMetrics(
        userId: number | string,
        strategyId: string | number,
        mint: string,
        orderMetrics: sniperOrderMetrics,
    ) {
        await this.client.hSet(
            this.activeOrderMetrics,
            this.getMetricsField(userId, strategyId, mint),
            JSON.stringify(orderMetrics),
        );
    }

    async getActiveMetrics(
        userId: number | string,
        strategyId: string | number,
        mint: string,
    ): Promise<sniperOrderMetrics | null> {
        const result = await this.client.hGet(
            this.activeOrderMetrics,
            this.getMetricsField(userId, strategyId, mint),
        );
        return result ? JSON.parse(result) : null;
    }

    async deleteActiveMetrics(
        userId: number | string,
        strategyId: string | number,
        mint: string,
    ) {
        await this.client.hDel(
            this.activeOrderMetrics,
            this.getMetricsField(userId, strategyId, mint),
        );
    }

    async getActiveMetricsByUserAndStrategy(
        userId: number | string,
        strategyId: string | number,
    ): Promise<{ [mint: string]: sniperOrderMetrics }> {
        const allMetrics = await this.client.hGetAll(this.activeOrderMetrics);
        const prefix = `${userId}:${strategyId}:`;
        const filteredMetrics: { [mint: string]: sniperOrderMetrics } = {};

        for (const key in allMetrics) {
            if (key.startsWith(prefix)) {
                const mint = key.slice(prefix.length);
                try {
                    filteredMetrics[mint] = JSON.parse(allMetrics[key]);
                } catch (e) {
                    console.error(`Failed to parse metrics for key ${key}:`, e);
                }
            }
        }

        return filteredMetrics;
    }

    // async updateHourlyMetrics(
    //     month: number,
    //     day: number,
    //     hour: number,
    //     orderMetrics: sniperOrderMetrics,
    // ) {
    //     await this.client.hSet(
    //         this.hourlyOrderMetrics,
    //         this.getHourlyMetricsField(month, day, hour),
    //         JSON.stringify(orderMetrics),
    //     );
    // }

    // async getHourlyMetrics(
    //     month: number,
    //     day: number,
    //     hour: number,
    // ): Promise<sniperOrderMetrics | null> {
    //     const result = await this.client.hGet(
    //         this.hourlyOrderMetrics,
    //         this.getHourlyMetricsField(month, day, hour),
    //     );
    //     return result ? JSON.parse(result) : null;
    // }

    // async deleteHourlyMetrics(month: number, day: number, hour: number) {
    //     await this.client.hDel(
    //         this.hourlyOrderMetrics,
    //         this.getHourlyMetricsField(month, day, hour),
    //     );
    // }
}

export function getNewOrderMetricsObject(
    time: string,
    isOnChain: boolean,
): sniperOrderMetrics {
    return {
        buy: {
            eventTriggered: time,
            addedToQ: null,
            startedProcessing: null,
            completed: null,
            dbUpdated: null,
        },
        sell: {
            eventTriggered: null,
            addedToQ: null,
            startedProcessing: null,
            completed: null,
            dbUpdated: null,
        },
        isOnChain: isOnChain,
    };
}

let orderMetricsCache: OrderMetricsStore | null = null;
export async function getOrderMetricsStore(): Promise<OrderMetricsStore> {
    if (!orderMetricsCache) {
        const tokenMap = await getRedisClient();
        const client: any = tokenMap.getClient();
        orderMetricsCache = new OrderMetricsStore(client);
    }
    return orderMetricsCache;
}
