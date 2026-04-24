import { pumpswapTokens } from "@prisma/client";
import { pumpSwapWithdrawDecode } from "../../types";
import { pumpSwapStore } from "../../redis/pumpswap";

const updatePumpToken = async (
    decoded: pumpSwapWithdrawDecode,
    existingPump: pumpswapTokens,
    cache: pumpSwapStore,
) => {
    existingPump.liquidityInSol = decoded.liquidityInSol;
    existingPump.liquidityInUsd = decoded.liquidityInUsd;
    existingPump.priceInSol = decoded.priceInSol;
    existingPump.priceInUsd = decoded.priceInUsd;
    existingPump.reserveSol = decoded.solReserve.toString();
    existingPump.reserveToken = decoded.tokenReserve.toString();
    await cache.createToken(existingPump.mint, existingPump);
    await cache.addLiquidityRemoved(existingPump.mint);
};

export default updatePumpToken;
