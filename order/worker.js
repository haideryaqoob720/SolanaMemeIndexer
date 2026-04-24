// worker.js - Worker process that handles individual tasks
import { readableStreamToText } from "bun";
import { placeStrategyOrder } from "./src/placeOrder";

class WorkerProcessor {
    constructor() {
        this.requestId = process.env.REQUEST_ID;
        this.startTime = Date.now();
        console.log("new worker");
    }

    async processOrder(orderData) {
        // console.log(orderData, "worker");
        try {
            if (orderData.orderType === "buy") {
                // console.log("buy");
                return await this.processBuyOrder(orderData);
            } else if (orderData.orderType === "sell") {
                return await this.processSellOrder(orderData);
            } else {
                throw new Error("Invalid order type");
            }
        } catch (error) {
            throw new Error(`Order processing failed: ${error.message}`);
        }
    }

    async processBuyOrder(orderData) {
        // Buy order logic - placeholder for your implementation
        // Add your buy order processing logic here
        await placeStrategyOrder(
            orderData.dex,
            orderData.snipers,
            orderData.mint,
            orderData.decimals,
            orderData.solPrice,
            orderData.market,
            orderData.priceInSol,
        );
        return {
            orderType: "buy",
            orderId: `buy_${this.requestId}_${Date.now()}`,
            status: "processed",
            data: orderData,
            metadata: {
                processedAt: new Date().toISOString(),
                processingNode: process.pid,
            },
        };
    }

    async processSellOrder(orderData) {
        // Sell order logic - placeholder for your implementation
        // Add your sell order processing logic here

        return {
            orderType: "sell",
            orderId: `sell_${this.requestId}_${Date.now()}`,
            status: "processed",
            data: orderData,
            metadata: {
                processedAt: new Date().toISOString(),
                processingNode: process.pid,
            },
        };
    }

    async run() {
        try {
            // Read input from stdin
            const stdin = await readableStreamToText(Bun.stdin.stream());
            const orderData = JSON.parse(stdin.trim());
            // console.log(orderData, "worker run");

            // Process the order
            const result = await this.processOrder(orderData);

            // Add worker metadata
            const output = {
                ...result,
                workerId: this.requestId,
                processingTime: Date.now() - this.startTime,
                workerPid: process.pid,
                timestamp: new Date().toISOString(),
            };

            // Output result to stdout
            console.log(JSON.stringify(output));
            process.exit(0);
        } catch (error) {
            // Output error to stderr
            console.error(`Worker error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Only run if this is the worker process
if (process.env.WORKER_MODE === "true") {
    const worker = new WorkerProcessor();
    worker.run();
}

export { WorkerProcessor };
