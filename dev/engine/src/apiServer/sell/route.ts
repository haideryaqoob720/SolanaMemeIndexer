import express from "express";
import getSniperStrategyStore from "../../redis/sniperStrategies";
import getPumpSwapStore from "../../redis/pumpswap";
import getOrdersStore from "../../redis/sniperOrders";
import getRedisClient from "../../redis/store";
import axios from "axios";

const router = express.Router();

router.post("/sell", async (req: any, res: any) => {
  try {
    const { mint, userId, strategyId } = req.body;

    if (!mint || !userId || !strategyId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const [orderCache, strategyCache, pumpSwapCache, tokenMap] =
      await Promise.all([
        getOrdersStore(),
        getSniperStrategyStore(),
        getPumpSwapStore(),
        getRedisClient(),
      ]);

    const [sniperOrder, strategy, existingMint, solPrice] = await Promise.all([
      orderCache.readOneOrder(mint, userId, strategyId),
      strategyCache.getStrategy(strategyId.toString()),
      pumpSwapCache.getToken(mint),
      tokenMap.getSolPrice(),
    ]);

    if (!sniperOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Sniper order not found" });
    }

    if (sniperOrder.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Order is not in pending state" });
    }

    if (
      !existingMint ||
      !existingMint.priceInUsd ||
      existingMint.priceInUsd <= 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing price for mint" });
    }

    const inputData = {
      sniper: strategy,
      order: sniperOrder,
      dex: "PumpSwap",
      mint: sniperOrder.mint,
      decimals: sniperOrder.decimals,
      solPrice,
      market: existingMint.marketAccount,
      priceInSol: existingMint.priceInUsd / solPrice,
      isQuoteSol: existingMint.isQuoteVaultSol,
      isWithdraw: false,
    };
    const response = await axios.post("http://localhost:6000/api/sell", inputData);

    // console.log("pumpswap sold", response.data);

    return res.json({
      success: true,
      response: response.data,
      inputData,
      message: "Token sent for selling via PumpSwap",
    });
  } catch (err) {
    console.error("Sell error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: (err as Error).message,
    });
  }
});

export const sellRouter = router;
