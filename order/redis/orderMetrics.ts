import type { RedisClientType } from "redis";
import { getRedisConnection } from "./redisConnection";
import * as cron from "node-cron";

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

class OrderMetricsStore {
    private baseKey: string = "orderMetrics";
    private activeOrderMetrics: string = `${this.baseKey}:active`;
    private hourlyOrderMetrics: string = `${this.baseKey}:hourly`;
    private client: RedisClientType;
    private cronJob: cron.ScheduledTask | null = null;

    constructor(client: RedisClientType) {
        this.client = client;
        this.initializeCronJob();
    }

    private initializeCronJob() {
        // Run every hour at minute 0
        this.cronJob = cron.schedule(
            "0 * * * *",
            async () => {
                try {
                    await this.processHourlyMetrics();
                } catch (error) {
                    console.error("Error processing hourly metrics:", error);
                }
            },
            // {
            //     scheduled: true,
            // },
        );
    }
    private isoToMs(iso: string): number {
        return new Date(iso).getTime();
    }
    private async processHourlyMetrics() {
        const now = new Date();
        const month = now.getMonth() + 1; // getMonth() returns 0-11
        const day = now.getDate();
        const hour = now.getHours();

        // Get all active metrics
        const allActiveMetrics = await this.client.hGetAll(
            this.activeOrderMetrics,
        );
        let buyOrderTimeSum: number = 0;
        let sellOrderTimeSum: number = 0;

        // Process and aggregate metrics for this hour
        const hourlyData = {
            totalOrders: Object.keys(allActiveMetrics).length,
            completedBuyOrders: 0,
            completedSellOrders: 0,
            onChainOrders: 0,
            offChainOrders: 0,
            averageBuyOrderTime: 0,
            averageSellOrderTime: 0,
            timestamp: now.toISOString(),
        };

        // Analyze active metrics
        for (const [key, value] of Object.entries(allActiveMetrics)) {
            try {
                const metrics: sniperOrderMetrics = JSON.parse(value);

                if (metrics.buy.completed) hourlyData.completedBuyOrders++;
                if (metrics.sell.completed) hourlyData.completedSellOrders++;
                if (metrics.buy.eventTriggered && metrics.buy.dbUpdated) {
                    const timeTaken =
                        this.isoToMs(metrics.buy.dbUpdated) -
                        this.isoToMs(metrics.buy.eventTriggered);
                    buyOrderTimeSum += timeTaken;
                }
                if (metrics.sell.eventTriggered && metrics.sell.dbUpdated) {
                    const timeTaken =
                        this.isoToMs(metrics.sell.dbUpdated) -
                        this.isoToMs(metrics.sell.eventTriggered);
                    sellOrderTimeSum += timeTaken;
                }
                if (metrics.isOnChain) {
                    hourlyData.onChainOrders++;
                } else {
                    hourlyData.offChainOrders++;
                }
            } catch (error) {
                console.error(`Error parsing metrics for key ${key}:`, error);
            }
        }
        hourlyData.averageBuyOrderTime =
            buyOrderTimeSum / hourlyData.completedBuyOrders;
        hourlyData.averageSellOrderTime =
            sellOrderTimeSum / hourlyData.completedSellOrders;

        await this.updateHourlyMetrics(month, day, hour, hourlyData);
        await Promise.all(
            Object.entries(allActiveMetrics).map(async ([key, value]) => {
                await this.deleteActiveMetrics(key);
            }),
        );
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
        // userId: number | string,
        // strategyId: string | number,
        // mint: string,
        field: string,
    ) {
        await this.client.hDel(
            this.activeOrderMetrics,
            // this.getMetricsField(userId, strategyId, mint),
            field,
        );
    }

    async updateHourlyMetrics(
        month: number,
        day: number,
        hour: number,
        hourlyData: any,
    ) {
        await this.client.hSet(
            this.hourlyOrderMetrics,
            this.getHourlyMetricsField(month, day, hour),
            JSON.stringify(hourlyData),
        );
    }

    async getHourlyMetrics(
        month: number,
        day: number,
        hour: number,
    ): Promise<any | null> {
        const result = await this.client.hGet(
            this.hourlyOrderMetrics,
            this.getHourlyMetricsField(month, day, hour),
        );
        return result ? JSON.parse(result) : null;
    }

    async deleteHourlyMetrics(month: number, day: number, hour: number) {
        await this.client.hDel(
            this.hourlyOrderMetrics,
            this.getHourlyMetricsField(month, day, hour),
        );
    }
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
        const connection = await getRedisConnection();
        orderMetricsCache = new OrderMetricsStore(connection.getClient());
    }
    return orderMetricsCache;
}
