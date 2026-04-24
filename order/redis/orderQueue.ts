import { createClient, type RedisClientType } from "redis";
import type { sniperOrderRedis } from "./cache.type";
import type { Strategy } from "../src/types";
import type { sniperOrderMetrics } from "./orderMetrics";

export interface WorkerConfig {
    workerId: string;
}

export interface OrderData {
    order: sniperOrderRedis;
    sniper: Strategy;
    orderMetrics: sniperOrderMetrics;
    solPrice: number;
    market: string;
    priceInSol: number;
    decimals: number;
    isQuoteSol: boolean;
    isWithdraw: boolean;
    mint: string;
    type: "buy" | "sell";
    dex: "PumpSwap" | "Raydium";
    enqueuedAt: string;
    timestamp: string;
}

export interface ProcessedOrder extends OrderData {
    processedAt: string;
    processingTimeMs: number;
    workerId: string;
    processId: number;
    status: "processed" | "failed";
}

export class RedisQueue {
    private static instance: RedisQueue | null = null;
    private client: RedisClientType;
    private readonly QUEUE_KEY = "orders:queue";
    private readonly PROCESSING_KEY = "orders:processing";
    private readonly FAILED_KEY = "orders:failed";
    private isInitialized: boolean = false;

    constructor() {
        this.client = createClient({
            url:
                process.env.REDIS_URL ??
                "redis://default:redisLamboRadar@46.4.21.252:6379/0",
            socket: {
                keepAlive: true,
            },
        });

        this.setupErrorHandlers();
    }
    public static getInstance(): RedisQueue {
        if (!RedisQueue.instance) {
            RedisQueue.instance = new RedisQueue();
        }
        return RedisQueue.instance;
    }

    public static resetInstance(): void {
        if (RedisQueue.instance) {
            RedisQueue.instance.disconnect().catch(console.error);
            RedisQueue.instance = null;
        }
    }
    private setupErrorHandlers(): void {
        this.client.on("error", (err) => {
            console.error("Redis client error:", err);
        });

        this.client.on("connect", () => {
            console.log("Redis client connected");
        });

        this.client.on("reconnecting", () => {
            console.log("Redis client reconnecting...");
        });

        this.client.on("ready", () => {
            console.log("Redis client ready");
        });
    }

    async connect(): Promise<void> {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }

    async disconnect(): Promise<void> {
        if (this.client.isOpen) {
            await this.client.disconnect();
        }
    }

    async pushOrder(orderData: OrderData | any): Promise<number> {
        try {
            const orderJson = JSON.stringify(orderData);
            const queueLength = await this.client.lPush(
                this.QUEUE_KEY,
                orderJson,
            );
            return queueLength;
        } catch (error) {
            console.error("Error pushing order to queue:", error);
            throw error;
        }
    }

    async popOrderForProcessing(
        timeoutSeconds: number = 10,
    ): Promise<string | null> {
        try {
            const result = await this.client.brPop(
                this.QUEUE_KEY,
                timeoutSeconds,
            );

            if (!result) {
                return null; // Timeout occurred
            }

            const orderJson = result.element;
            // console.log(orderJson, "poping");

            await this.client.lPush(this.PROCESSING_KEY, orderJson);

            return orderJson;
        } catch (error) {
            console.error("Error popping order for processing:", error);
            throw error;
        }
    }

    async createProcessingTracker(
        workerId: string,
        orderId: string,
        orderJson: string,
    ): Promise<void> {
        const processingKey = `${this.PROCESSING_KEY}:${workerId}:${orderId}`;
        await this.client.setEx(processingKey, 300, orderJson); // 5 min expiry
    }

    async completeOrderProcessing(
        workerId: string,
        orderId: string,
        orderJson: string,
    ): Promise<void> {
        const processingKey = `${this.PROCESSING_KEY}:${workerId}:${orderId}`;

        // Use multi for atomic operation
        const multi = this.client.multi();
        multi.lRem(this.PROCESSING_KEY, 1, orderJson);
        multi.del(processingKey);

        await multi.exec();
    }
    async handleFailedOrder(
        workerId: string,
        orderId: string,
        orderJson: string,
        error: Error,
    ): Promise<void> {
        const failedOrder = {
            originalOrder: JSON.parse(orderJson),
            error: error.message,
            stack: error.stack,
            failedAt: new Date().toISOString(),
            workerId,
            processId: process.pid,
            retryCount: 0,
            failureReason: "processing_error",
        };

        const processingKey = `${this.PROCESSING_KEY}:${workerId}:${orderId}`;

        const multi = this.client.multi();
        multi.lPush(this.FAILED_KEY, JSON.stringify(failedOrder));
        multi.lRem(this.PROCESSING_KEY, 1, orderJson);
        multi.del(processingKey);

        await multi.exec();
    }
    async getQueueStats(): Promise<{
        pending: number;
        processing: number;
        failed: number;
    }> {
        const [pending, processing, failed] = await Promise.all([
            this.client.lLen(this.QUEUE_KEY),
            this.client.lLen(this.PROCESSING_KEY),
            this.client.lLen(this.FAILED_KEY),
        ]);

        return { pending, processing, failed };
    }
    isConnected(): boolean {
        return this.client.isOpen && this.client.isReady;
    }
}

let orderQueue: RedisQueue | null = null;
async function getRedisQueue(): Promise<RedisQueue> {
    if (!orderQueue) {
        // orderQueue = new RedisQueue();
        orderQueue = RedisQueue.getInstance();
        await orderQueue.connect();
    }
    return orderQueue;
}

export default getRedisQueue;
