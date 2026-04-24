import {
    RedisQueue,
    type OrderData,
    type ProcessedOrder,
    type WorkerConfig,
} from "../../redis/orderQueue";
import { logError } from "../errorLogger";
import orderLogger from "../orderLogger";
import { placeStrategyOrder } from "../placeOrder";
import { pumpSwapSell } from "../sniperSell/pumpswapSell";
import { RateLimiter } from "limiter";

export class OrderWorker {
    private workerId: string;
    private isRunning: boolean = false;
    private redisQueue: RedisQueue;
    private ordersProcessed: number = 0;
    private startTime: number;
    private limiter: RateLimiter;

    constructor(config: WorkerConfig) {
        this.workerId = config.workerId;
        this.startTime = Date.now();

        // Get singleton instance of RedisQueue
        this.redisQueue = RedisQueue.getInstance();
        this.limiter = new RateLimiter({
            tokensPerInterval: 10,
            interval: "second",
        });

        this.setupProcessHandlers();
    }
    private async fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
        await this.limiter.removeTokens(1);
        return await fn();
    }

    private setupProcessHandlers(): void {
        // Handle shutdown signals
        process.on("SIGTERM", () => {
            this.log("info", "Received SIGTERM, shutting down gracefully");
            this.gracefulShutdown();
        });

        process.on("SIGINT", () => {
            this.log("info", "Received SIGINT, shutting down gracefully");
            this.gracefulShutdown();
        });

        // Handle uncaught exceptions gracefully
        process.on("uncaughtException", (error) => {
            this.log("error", "Uncaught exception", {
                error: error.message,
                stack: error.stack,
            });
            this.gracefulShutdown();
        });

        process.on("unhandledRejection", (reason, promise) => {
            this.log("error", "Unhandled promise rejection", {
                reason: String(reason),
                promise: String(promise),
            });
        });

        // Send heartbeat to parent process
        // setInterval(() => {
        //     this.sendHeartbeat();
        // }, 5000); // Every 5 seconds
    }

    private log(
        level: "info" | "error" | "warn",
        message: string,
        data: any = {},
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            workerId: this.workerId,
            processId: process.pid,
            message,
            ordersProcessed: this.ordersProcessed,
            uptime: Date.now() - this.startTime,
            ...data,
        };

        if (level === "error") {
            console.error(JSON.stringify(logEntry));
            // errorLoggerWithRotation.log("error", {
            //     message: logEntry,
            // });
            logError(logEntry);
        } else {
            console.log(JSON.stringify(logEntry));
        }
    }

    private sendHeartbeat(): void {
        // Send heartbeat to parent via stdout
        const heartbeat = {
            type: "heartbeat",
            workerId: this.workerId,
            processId: process.pid,
            ordersProcessed: this.ordersProcessed,
            uptime: Date.now() - this.startTime,
            memoryUsage: process.memoryUsage(),
            timestamp: Date.now(),
            isRunning: this.isRunning,
            redisConnected: this.redisQueue.isConnected(),
            // redisInstance: this.redisQueue.getInstanceInfo()
        };

        // Use special prefix for parent to capture heartbeats
        console.log(`WORKER_HEARTBEAT:${JSON.stringify(heartbeat)}`);
    }

    async start(): Promise<void> {
        try {
            await this.redisQueue.connect();

            this.isRunning = true;
            this.log("info", "Worker started and connected to Redis");

            // Start the main processing loop
            await this.processOrderLoop();
        } catch (error) {
            this.log("error", "Failed to start worker", {
                error: (error as Error).message,
            });
            process.exit(1);
        }
    }

    private async processOrderLoop(): Promise<void> {
        let healthCheckCounter = 0;

        while (this.isRunning) {
            let orderJson: string | null = null;
            let orderData: OrderData | null = null;
            let orderId: string | null = null;

            try {
                // Get order from queue with timeout
                orderJson = await this.redisQueue.popOrderForProcessing(1);
                // console.log(orderJson, "test log");
                if (!orderJson) {
                    // Timeout occurred - do health check
                    healthCheckCounter++;
                    if (healthCheckCounter % 6 === 0) {
                        // Every 60 seconds
                        this.log("info", "Health check during idle period", {
                            queueChecks: healthCheckCounter,
                            redisConnected: this.redisQueue.isConnected(),
                        });
                    }
                    continue;
                }

                // Parse order data
                orderData = JSON.parse(orderJson);
                // console.log(orderJson, "test log");
                if (!orderData) {
                    console.log("no order found");
                    return;
                }
                orderId = `${orderData.sniper.userId}:${orderData.sniper.id}:${orderData.mint}`;

                // Create processing tracking key for crash recovery
                await this.redisQueue.createProcessingTracker(
                    this.workerId,
                    orderId,
                    orderJson,
                );

                this.log("info", "Order processing started", {
                    orderId,
                    orderType: orderData.type,
                });
                orderLogger.info(`started processing order ${orderId}`);
                // Process the order
                const processedOrder = await this.processOrder(orderData);
                orderLogger.info(`completed processing order ${orderId}`);

                // Complete processing and cleanup
                await this.redisQueue.completeOrderProcessing(
                    this.workerId,
                    orderId,
                    orderJson,
                );

                this.ordersProcessed++;
                this.log("info", "Order processing completed", {
                    orderId,
                    processingTimeMs: processedOrder.processingTimeMs,
                    totalProcessed: this.ordersProcessed,
                    type: processedOrder.type,
                });
            } catch (error) {
                this.log("error", "Error during order processing", {
                    orderId,
                    error: (error as Error).message,
                    stack: (error as Error).stack,
                });

                // Handle failed order
                if (orderJson && orderData && orderId) {
                    try {
                        await this.redisQueue.handleFailedOrder(
                            this.workerId,
                            orderId,
                            orderJson,
                            error as Error,
                        );
                        this.log("info", "Failed order moved to failed queue", {
                            orderId,
                        });
                    } catch (handleError) {
                        this.log("error", "Failed to handle failed order", {
                            orderId,
                            originalError: (error as Error).message,
                            handlingError: (handleError as Error).message,
                        });
                    }
                }

                // Continue processing other orders
                continue;
            }
        }
    }

    private async processOrder(orderData: OrderData): Promise<ProcessedOrder> {
        const startTime = Date.now();

        try {
            this.log("info", "Starting order business logic", {
                orderId: `${orderData.sniper.userId}:${orderData.sniper.id}:${orderData.mint}`,
                type: orderData.type,
                symbol: orderData.mint,
            });
            // console.log(orderData, "processing");
            if (orderData.type === "buy") {
                // console.log("inPUmpSwap <<<<<<--------------->>>>>>>");
                if (orderData.dex === "PumpSwap") {
                    // console.log("inPUmpSwap <<<<<<--------------->>>>>>>");
                    orderLogger.info(
                        `place pumpswap order ${orderData.sniper.userId}:${orderData.sniper.id}:${orderData.mint}`,
                    );
                    orderData.orderMetrics.buy.startedProcessing =
                        new Date().toISOString();
                    const result = await placeStrategyOrder(
                        orderData.dex,
                        orderData.sniper,
                        orderData.mint,
                        orderData.decimals,
                        orderData.solPrice,
                        orderData.market,
                        orderData.priceInSol,
                        orderData.isQuoteSol,
                        orderData.orderMetrics,
                    );
                    console.log(
                        new Date().toUTCString(),
                        "buy order processed",
                    );
                }
            } else if (orderData.type === "sell") {
                // console.log("inPUmpSwap <<<<<<--------------->>>>>>>");
                if (orderData.dex === "PumpSwap") {
                    // console.log("inPUmpSwap <<<<<<--------------->>>>>>>");
                    if (orderData.isWithdraw) {
                        console.log(
                            `withderaw order for ${orderData.order.userId}:${orderData.order.strategyId}:${orderData.mint}`,
                        );
                    }
                    orderLogger.info(
                        "starting sell order",
                        `${orderData.sniper.userId}:${orderData.sniper.id}:${orderData.mint}`,
                    );
                    try {
                        if (orderData.orderMetrics.sell) {
                            orderData.orderMetrics.sell.startedProcessing =
                                new Date().toISOString();
                        } else {
                            console.log(orderData.orderMetrics);
                        }
                    } catch (error: any) {
                        console.log(error.message);
                    }
                    const result = await pumpSwapSell(
                        orderData.mint,
                        orderData.priceInSol,
                        orderData.priceInSol * orderData.solPrice,
                        orderData.solPrice,
                        orderData.order,
                        orderData.market,
                        orderData.isQuoteSol,
                        orderData.isWithdraw,
                        orderData.orderMetrics,
                    );
                }
            }
            const processingTime = Date.now() - startTime;
            const processedOrder: ProcessedOrder = {
                ...orderData,
                processedAt: new Date().toISOString(),
                processingTimeMs: processingTime,
                workerId: this.workerId,
                processId: process.pid,
                status: "processed",
            };

            this.log("info", "Order business logic completed", {
                orderId: `${orderData.sniper.userId}:${orderData.sniper.id}:${orderData.mint}`,
                processingTimeMs: processingTime,
            });

            return processedOrder;
        } catch (error) {
            const processingTime = Date.now() - startTime;

            this.log("error", "Order processing business logic failed", {
                orderId: `${orderData.sniper.userId}:${orderData.sniper.id}:${orderData.mint}`,
                processingTimeMs: processingTime,
                error: (error as Error).message,
            });
            console.error(orderData.orderMetrics, "orderMetrics");
            throw new Error(
                `Order processing failed: ${(error as Error).message}`,
            );
        }
    }

    async getWorkerStats(): Promise<any> {
        try {
            const queueStats = await this.redisQueue.getQueueStats();

            return {
                workerId: this.workerId,
                processId: process.pid,
                isRunning: this.isRunning,
                ordersProcessed: this.ordersProcessed,
                uptime: Date.now() - this.startTime,
                memoryUsage: process.memoryUsage(),
                redisConnected: this.redisQueue.isConnected(),
                queueStats,
            };
        } catch (error) {
            this.log("error", "Failed to get worker stats", {
                error: (error as Error).message,
            });
            return null;
        }
    }

    async stop(): Promise<void> {
        this.log("info", "Stopping worker processing");
        this.isRunning = false;
    }

    private async gracefulShutdown(): Promise<void> {
        this.log("info", "Starting graceful shutdown");
        this.isRunning = false;

        try {
            // Wait a bit for current order processing to complete
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Note: Don't disconnect the singleton here as other workers might be using it
            // The singleton will be cleaned up when the process exits

            this.log("info", "Worker shutdown completed", {
                totalOrdersProcessed: this.ordersProcessed,
                uptime: Date.now() - this.startTime,
            });

            process.exit(0);
        } catch (error) {
            this.log("error", "Error during graceful shutdown", {
                error: (error as Error).message,
            });
            process.exit(1);
        }
    }
}
