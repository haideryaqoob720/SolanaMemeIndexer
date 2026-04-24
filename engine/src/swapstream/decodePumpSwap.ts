import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import idl from "../../pumpswap_idl.json";
import { RedisCache } from "../redis/store";
import { TransactionFormatter } from "../utils/generalDecoder";
import { config } from "../config";
import { decodeEvent, handleCreateEvent } from "../pumpSwap/createEvent";
import { tokenInitialMetrics } from "../filters/basic/getInitialMetrics";
import { createToken } from "../db/addToken";
import { PublicKey } from "@solana/web3.js";
import { startPumpswapCreateTokenProcess } from "../pumpSwap/createProcess";
import { handleSwapEvent } from "../pumpSwap/swapEvent";
import handleWithdrawEvent from "../pumpSwap/withdraw/withdrawEvent";
import { getBasicTxInfo } from "../pumpSwap/instructions/basicDecode";
import { extractAllPumpSwapIx } from "../pumpSwap/instructions/extract";
import { processPumpSwapEvents } from "../pumpSwap/instructions/processEvents";
import getOrdersStore from "../redis/sniperOrders";
import getSniperStrategyStore from "../redis/sniperStrategies";
import { getOrderVolumeStore } from "../redis/orderVolume";

const bs58 = require("bs58");
const { base64 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const { BorshCoder, BN } = require("@coral-xyz/anchor");

// const
export const decodePumpSwap = async (data: any, tokenMap: RedisCache) => {
    const ordersCache = await getOrdersStore();
    const orderVolumeCache = await getOrderVolumeStore();
    const strategiesCache = await getSniperStrategyStore();
    const logs = data?.transaction?.transaction?.meta?.logMessages;
    const basicTxInfo = getBasicTxInfo(data);
    if (!basicTxInfo) return null;
    const instructions = extractAllPumpSwapIx(
        basicTxInfo.decodedTx,
        basicTxInfo.signature,
        // basicTxInfo.mint,
    );
    // const strategies = await strategiesCache.getAllStrategies();
    // const ordersForToken = await ordersCache.getActiveOrder(mint, userId, strategyId)

    // console.log(instructions);
    // await Promise.all([
    //     instructions.forEach(async (ix) => {
    //         if (!ix) return;
    //         await processPumpSwapEvents(
    //             ix.name,
    //             ix,
    //             data,
    //             logs,
    //             basicTxInfo.decodedTx,
    //             basicTxInfo.signature,
    //         );
    //     }),
    // ]);
    const strategies = await strategiesCache.getAllStrategies();
    const orderVolumes = await orderVolumeCache.getAllUsersOrderVolume();

    for (const ix of instructions) {
        if (!ix) continue;
        await processPumpSwapEvents(
            ix.name,
            ix,
            data,
            logs,
            basicTxInfo.decodedTx,
            basicTxInfo.signature,
            strategies,
            orderVolumes,
        );
    }
};
