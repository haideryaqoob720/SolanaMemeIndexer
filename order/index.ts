// index.ts - Main server entry point
import { createHash } from "crypto";
import type { OrderRequest, OrderSellRequest } from "./src/types";
import getRedisQueue from "./redis/orderQueue";
import { spawn } from "bun";
import path from "path";
import { OrderWorker } from "./src/workers/orderProcessor";
// import { placeStrategyOrder } from "./src/placeOrder";
// import { pumpSwapSell } from "./src/sniperSell/pumpswapSell";

const queue = await getRedisQueue();

// const orderWorker = new OrderWorker({
//     workerId: `test_worker_${process.pid}`,
// });
// orderWorker.start().catch(console.error);
// console.log("✅ OrderWorker started");
const workerPath = path.join(import.meta.dir, "worker.ts");
function startWorkers(workers: number, vWorkers: number) {
    for (let i = 0; i < workers; i++) {
        spawn({
            // cmd: [process.execPath, "./worker.ts"],
            cmd: [process.execPath, workerPath],
            stdio: ["inherit", "inherit", "inherit"],
            env: {
                WORKER_ID: `worker_${i + 1}`,
                REDIS_HOST: "localhost",
                REDIS_PORT: "6379",
                WORKERS: vWorkers.toString(),
            },
        });
    }
}

startWorkers(3, 1); // 12 virtual workers in 4 processes

// Wait a moment for worker to initialize
await new Promise((resolve) => setTimeout(resolve, 1000));

const routes = {
    "POST /api/buy": async (req: Request, url: URL) => {
        const body: any = await req.json();

        const requestId = createHash("md5")
            .update(`${Date.now()}-${Math.random()}-${process.pid}`)
            .digest("hex");

        try {
            const orderData: OrderRequest = { ...body, type: "buy" };
            // console.log(orderData);
            // const result = await placeStrategyOrder(
            //     orderData.dex,
            //     orderData.sniper,
            //     orderData.mint,
            //     orderData.decimals,
            //     orderData.solPrice,
            //     orderData.market,
            //     orderData.priceInSol,
            // );
            // console.log("buy pumpSwap");
            const result = await queue.pushOrder(orderData);
            console.log(
                new Date().toUTCString(),
                orderData.mint,
                "buy order Received",
            );
            // console.log(result, "order pushed to q");

            return new Response(JSON.stringify(result), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "X-Request-ID": requestId,
                },
            });
        } catch (error: any) {
            console.log("error placing buy order", error.message);
            return new Response(
                JSON.stringify({
                    error: error.message,
                    requestId,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Request-ID": requestId,
                    },
                },
            );
        }
    },

    "POST /api/sell": async (req: Request, url: URL) => {
        const body: any = await req.json().catch(() => ({}));

        const requestId = createHash("md5")
            .update(`${Date.now()}-${Math.random()}-${process.pid}`)
            .digest("hex");

        try {
            const orderData: OrderSellRequest = { ...body, type: "sell" };
            let result: any;
            if (orderData.dex === "PumpSwap") {
                // console.log("sell pumpSwap");
                // if (!mint || !priceInSol || !priceInUsd) {
                //     return;
                // }
                // result = await pumpSwapSell(
                //     orderData.mint,
                //     orderData.priceInSol,
                //     orderData.priceInSol * orderData.solPrice,
                //     orderData.solPrice,
                //     orderData.order,
                //     orderData.market,
                // );
                result = await queue.pushOrder(orderData);
                console.log(
                    new Date().toUTCString(),
                    orderData.mint,
                    "sell order Received",
                );
            } else {
                console.log("sell Raydium");
                // await sniperSellRaydium(mint, parseFloat(priceInSol), parseFloat(priceInUsd), pnl === "true" ? true : false, tokenMap);
            }

            return new Response(JSON.stringify(result), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "X-Request-ID": requestId,
                },
            });
        } catch (error: any) {
            return new Response(
                JSON.stringify({
                    error: error.message,
                    requestId,
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Request-ID": requestId,
                    },
                },
            );
        }
    },

    "GET /api/health": async () => {
        const health = {
            status: "healthy",
            pid: process.pid,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            // metrics: processManager.getMetrics(),
        };

        return new Response(JSON.stringify(health), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    },
};

// Request handler
async function handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const routeKey = `${req.method} ${url.pathname}`;

    // CORS headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    // Route matching
    const handler = routes[routeKey as keyof typeof routes];
    if (handler) {
        try {
            const response = await handler(req, url);
            // Add CORS headers to all responses
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        } catch (error) {
            console.error("Request handler error:", error);
            return new Response(
                JSON.stringify({
                    error: "Internal server error",
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                },
            );
        }
    }

    // 404 handler
    return new Response(
        JSON.stringify({
            error: "Route not found",
        }),
        {
            status: 404,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
            },
        },
    );
}

// Server configuration
const PORT = process.env.PORT || 6000;
const HOST = process.env.HOST || "0.0.0.0";

// Start server
const server = Bun.serve({
    port: PORT,
    hostname: HOST,
    fetch: handleRequest,
    error: (error) => {
        console.error("Server error:", error);
        return new Response("Internal Server Error", { status: 500 });
    },
});

console.log(`🚀 Server running on http://${HOST}:${PORT}`);
console.log(`📊 Process ID: ${process.pid}`);
console
    .log
    // `⚡ Max concurrent processes: ${processManager.maxConcurrentProcesses}`,
    ();

// Graceful shutdown handling
process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, shutting down gracefully...");
    // await processManager.gracefulShutdown();
    server.stop();
    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("Received SIGINT, shutting down gracefully...");
    // await processManager.gracefulShutdown();
    server.stop();
    process.exit(0);
});
