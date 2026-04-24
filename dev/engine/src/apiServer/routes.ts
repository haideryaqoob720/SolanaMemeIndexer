import { txEncode } from "@triton-one/yellowstone-grpc";
import { RedisCache } from "../redis/store";
import { createSniperOrders, migrateToken } from "./migration";
import https from "https";
import { createSocketService } from "./socket/newToken";
const fs = require("fs");
const path = require("path");
import cors from "cors";
import getRedisClient from "../redis/store";
import getSniperStrategyStore from "../redis/sniperStrategies";
import { getTokenFromRedis } from "./apiUtils/getTokensFromRedis";
import getAnalyticOrdersCache from "../redis/analyticOrders";
import prisma from "../prisma/prisma";
import { createRedisClient } from "./health/database";
import { createHealthRoutes } from "./health/routes";
import { analyticsRouter } from "./txAnalyticsRoutes";
import { sellRouter } from "./sell/route";
import { getOrderVolumeStore } from "../redis/orderVolume";
import { getOrderQueueStats } from "../redis/orderQueue";
import { getOrderMetricsStore } from "../redis/sniperOrderMetrics";

const express = require("express");

export async function ApiServer() {
    const app = express();
    app.use(express.json());
    app.use(
        cors({
            origin: [
                "https://www.lamboradar.com",
                "https://api.lamboradar.com",
                "http://localhost:3000",
                "http://localhost:3001",
            ],
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: [
                "Content-Type",
                "Authorization",
                "X-Requested-With",
            ],
        }),
    );
    // const tokenMap = new RedisCache();
    // await tokenMap.connect()
    const tokenMap = await getRedisClient();

    // For parsing URL encoded bodies
    app.use(express.urlencoded({ extended: true }));

    // app.get("/", (req: any, res: any) => {
    //   res.json({ message: "Hello Crud Node Express" });Me
    // });
    app.get("/tx/:mint", async (req: any, res: any) => {
        const { mint } = req.params;
        // console.log("mint api called <-------------------------", mint)
        const allTx = await tokenMap.getAllTx();
        let txRes: any[] = [];
        allTx.map((tx, index) => {
            if (tx.mint === mint) {
                txRes.push(tx);
            }
        });
        return res.status(200).json({ txRes });
    });

    app.post("/sniper/migrate", async (req: any, res: any) => {
        const body = req.body;

        const {
            mint,
            creator,
            liquidityInSol,
            solAddress,
            tokenAddress,
            parseInfo,
            newOrders,
            metadata,
            quoteIsSol,
            market,
            base,
            quote,
            // sniper,
            // price,
            // profit,
            // loss
        } = body;

        // console.log(body)
        console.log(`migrating token ${mint}`);
        try {
            await migrateToken(
                mint,
                creator,
                liquidityInSol,
                solAddress,
                tokenAddress,
                parseInfo,
                newOrders,
                metadata,
                quoteIsSol,
                market,
                base,
                quote,
                // sniper,
                // price,
                // profit,
                // loss
            );
            console.log(`migrated ${mint} successfully`);
        } catch (error: any) {
            return res.status(500).json({ err: error.message });
        }

        return res.status(200).json({ success: true });
    });

    app.post("/sniper/createOrder", async (req: any, res: any) => {
        const body = req.body;
        const ordersToCreate: any[] = body.ordersToCreate;
        let newOrdersId: number[] = [];
        await Promise.all(
            ordersToCreate.map(async (order) => {
                const {
                    mint,
                    creator,
                    liquidityInSol,
                    solAddress,
                    tokenAddress,
                    parseInfo,
                    sniper,
                    buyingPrice,
                    profit,
                    stopLoss,
                } = order;
                console.log(order);
                try {
                    const newOrder = await createSniperOrders(
                        mint,
                        sniper,
                        buyingPrice,
                        profit,
                        stopLoss,
                    );
                    // if(newOrder){
                    //   newOrdersId.push(newOrder.id)
                    // }
                } catch (error: any) {
                    console.log(`error creating sniper order ${mint}`);
                }
            }),
        );
        return res.status(200).json({ orders: newOrdersId });
    });

    app.get("/new-tokens-list", async (req: any, res: any) => {
        const list = await tokenMap.getAllnewTokens();
        if (list.length === 0 || list.length > 50) {
            return res
                .status(400)
                .send({ error: `no tokens found. length: ${list.length}` });
        }
        return res.status(200).send({ list });
    });
    //   app.post("/token", async (req: any, res: any) => {
    //     //   const reqBody = await req.json();
    //     console.log(req.body, "body");
    //     const mint = req.body.mint;
    //     const name = req.body.name;
    //     const symbol = req.body.symbol;
    //     const uri = req.body.uri;
    //     const data: Prisma.meme_token_testCreateInput = await getAllMetrics(
    //       mint,
    //       name,
    //       symbol,
    //       uri
    //     );
    //     const tokenData = await addToken(data);
    //     console.log(tokenData);
    //     res.json({ message: `token added: ${mint}`, data: data });
    //   });
    const options = {
        key: fs.readFileSync(
            // path.join("/etc/letsencrypt/live/cubicus.blog/privkey.pem")
            path.join(
                "/etc/letsencrypt/live/websocket.lamboradar.com/privkey.pem",
            ),
        ),
        cert: fs.readFileSync(
            // path.join("/etc/letsencrypt/live/cubicus.blog/fullchain.pem")
            path.join(
                "/etc/letsencrypt/live/websocket.lamboradar.com/fullchain.pem",
            ),
        ),
    };

    app.post("/strategy", async (req: any, res: any) => {
        try {
            const body = req.body;
            console.log(req.body);
            const { strategy } = body;
            let updatedStrategytypo = {
                ...strategy,
                totalHolders: strategy.total_holders,
            };
            delete updatedStrategytypo.total_holders;
            const cache = await getSniperStrategyStore();
            await cache.createStrategy(
                strategy.id.toString(),
                updatedStrategytypo,
            );
            const updatedStrategy = await cache.getStrategy(
                strategy.id.toString(),
            );
            console.log("updated strategy", updatedStrategy);
            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.log("error adding strategy to redis", error.message);
            return res.status(400).json({ error: error.message });
        }
    });

    app.put("/strategy", async (req: any, res: any) => {
        try {
            const body = req.body;
            console.log(req.body);
            const { strategy } = body;
            const cache = await getSniperStrategyStore();
            await cache.createStrategy(strategy.id.toString(), strategy);
            return res.status(200).json({ sucess: true });
        } catch (error: any) {
            console.log("error updating strategy in redis", error.message);
            return res.status(400).json({ error: error.message });
        }
    });
    app.delete("/strategy/:id", async (req: any, res: any) => {
        try {
            const { id } = req.params;
            console.log(id);
            const cache = await getSniperStrategyStore();
            await cache.deleteStrategy(id);
            return res.status(200).json({ sucess: true });
        } catch (error: any) {
            console.log("error deleting strategy form redis", error.message);
            return res.status(400).json({ error: error.message });
        }
    });

    app.get("/token/:mint", async (req: any, res: any) => {
        const { mint } = req.params;
        if (!mint) {
            console.log("no mint in request");
            return res.status(403).json({ error: "no mint provided" });
        }
        try {
            const token = await getTokenFromRedis(mint);
            if (!token) {
                return res.status(500).json({ error: "token not found" });
            }
            return res.status(200).json(token);
        } catch (error: any) {
            console.log("error getting token info from redis", error.message);
            return res.status(500).json({ error: error.message });
        }
    });
    app.post("/order-analytics", async (req: any, res: any) => {
        const { orderId, mint, isBuy } = req.body;
        // console.log("analytics called", orderId, mint);

        // console.log("order-analytics-debug: ", req.body)

        if (isNaN(orderId))
            return res.status(400).json({ error: "orderId must be a number." });

        if (!orderId || !mint)
            return res.status(400).json({ error: "Missing orderId or mint" });

        try {
            //Reading from redis:
            const cacheToken = await tokenMap?.readToken(mint);
            // console.log({ cacheToken });
            // console.log("order-analytics-debug", "Cache");
            if (cacheToken) {
                // console.log("order-analytics-debug", "Cache Found");
                const analyticOrderCache = await getAnalyticOrdersCache();
                await analyticOrderCache.createNewAnalyticOrder(mint, {
                    ...cacheToken,
                    orderid: Number(orderId),
                    mint,
                    isBuy,
                });
            }
            // const order = await prisma.sniperOrders.findUnique({
            //     where: { id: orderId },
            // });

            // if (!order) {
            //     return res.status(404).json({ error: "Order not found" });
            // }

            // const token = await prisma.tokens.findUnique({
            //     where: { mint },
            // });

            // if (!token) {
            //     return res.status(404).json({ error: "Token not found" });
            // }

            // const analyticsOrder = await createDefaultOrderAnlaytics(order, token);

            // console.log({analyticsOrder});

            return res.status(201).send("Saved to redis cache analytic orders");
        } catch (error) {
            console.error("❌ Error creating order analytics:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });
    app.get("/logs/order/error", async (req: any, res: any) => {
        res.download("/root/orderService/orderProcessorError.log");
    });
    app.get("/", async (req: any, res: any) => {
        console.log("Testing GET API");
        return res.status(200).json({ success: "pong" });
    });
    app.get("/order-volume/strategies/consumed", async (req: any, res: any) => {
        try {
            const orderVolumeCache = await getOrderVolumeStore();
            const orderVolume = await orderVolumeCache.getAllUsersOrderVolume();

            //order queue
            let queueStats;
            try {
                queueStats = await getOrderQueueStats();
            } catch (err) {
                console.log(err);
            }
            if (orderVolume) {
                const orderVolumeObj = Object.fromEntries(orderVolume);
                return res
                    .status(200)
                    .json({
                        success: true,
                        orderVolume: orderVolumeObj,
                        queueStats,
                    });
            }
            return res
                .status(400)
                .json({ success: false, message: "Could not find." });
        } catch (err) {
            return res
                .status(500)
                .json({ success: false, message: (err as Error).message });
        }
    });
    app.get(
        "/strategy-analytics/:userId/:strategyId",
        async (req: any, res: any) => {
            try {
                const { userId, strategyId } = req.params;

                const store = await getOrderMetricsStore();
                const userStrategiesMetrics =
                    await store.getActiveMetricsByUserAndStrategy(
                        userId,
                        strategyId,
                    );

                return res.status(200).json(userStrategiesMetrics);
            } catch (err: any) {
                console.error("Error in /strategy-analytics:", err);
                return res
                    .status(500)
                    .json({ message: err.message || "Internal server error" });
            }
        },
    );

    const redis = createRedisClient();
    app.use("/health", createHealthRoutes(prisma, redis));
    app.use("/api/analytics", analyticsRouter);
    app.use("/api/sniperOrder", sellRouter);
    const server = https.createServer(options, app);
    // const server = http.createServer(app);

    // Initialize Socket.io service with Redis subscription
    const socketService = createSocketService(server);

    // Register routes from the socket service
    socketService.registerRoutes(app);
    // await tokenMap.deleteTrending()

    // socketService.sendTrendindUpdates(tokenMap)
    const test = () => {
        socketService.sendTrendindUpdates(tokenMap);
    };
    setInterval(test, 5000);
    server.listen(5000, () => {
        // chnage port to 8000
        console.log("server running on port 5000");
    });
}
