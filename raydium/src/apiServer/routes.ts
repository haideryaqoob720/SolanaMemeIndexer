import { txEncode } from "@triton-one/yellowstone-grpc";
import { RedisCache } from "../redis/store";
import { fork } from "child_process";
import { placeSniperOrder } from "../sniper/pumpSwap";
import http from "http";
import getSniperStore, { SniperStore } from "../redis/sniperStore";
import { placeStrategyOrder } from "../sniper/strategyOrder";

const express = require("express");

export async function ApiServer() {
    // const cache = new SniperStore()
    // await cache.connect()
    const cache = await getSniperStore();
    console.log("api server");
    const app = express();
    app.use(express.json());
    // const tokenMap = new RedisCache();
    // await tokenMap.connect()
    // For parsing URL encoded bodies
    app.use(express.urlencoded({ extended: true }));

    app.post("/placeOrder/pumpSwap", async (req: any, res: any) => {
        const body = req.body;
        console.log(body, "body");
        const { decoded, slot } = body;
        console.log(decoded, { slot: slot });
        try {
            // await placeSniperOrder(decoded, slot, cache)
            return res.status(200);
        } catch (error: any) {
            console.log("error buying pumpswap token", error.message);
            return res.status(400);
        }
    });

    app.post("/placeOrder/strategy", async (req: any, res: any) => {
        const body = req.body;
        console.log("Called to create the sniper order:");
        const { snipers, dex, mint, decimals, solPrice, market, priceInSol } =
            body;
        try {
            await placeStrategyOrder(
                dex,
                snipers,
                mint,
                decimals,
                solPrice,
                market,
                priceInSol,
            );
            return res.status(200);
        } catch (error: any) {
            console.log("error creating sniperOrders", error.message);
            return res.status(400).json({
                message: "error creating sniperOrders",
                error: error.message,
            });
        }
    });
    app.get("/", (req: any, res: any) => {
        return res.status(200).json({ success: "pong" });
    });
    const server = http.createServer(app);
    server.listen(5003, () => {
        console.log("server running on 5003");
    });
}

process.on("message", () => {
    ApiServer();
});
