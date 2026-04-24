import { startGrpc } from "./gRpc";
import { updateProcess } from "./db/updateProcess";
import { deleteProcess } from "./db/deleteProcess";
import { resetCache } from "./redis/reset";
import { updateHoldersProcess } from "./filters/holdersProcess/createProcess";
import { getSocials } from "./filters/getSocials";
import { decode } from "./raydiumDecoder/decode";
import { updateTxProcess } from "./db/addManyTx";
import { tokenMetadataUpdateField } from "@solana/spl-token";
import { fixTxProcess } from "./db/fixTxError";
import getRedisClient, { RedisCache } from "./redis/store";
import { getRaydiumMetrics } from "./filters/getRaydiumFilters";
import { ApiServer } from "./apiServer/routes";
import { getTransferFeeAudit } from "./filters/filters";
import { PublicKey } from "@solana/web3.js";
import { listenToStreamUpdates } from "./redis/readStream";
import { RedisStream } from "./redis/stream";
import { removePendingOrdersProcess } from "./pendingDelete/handleProcess";
import { BN } from "@coral-xyz/anchor";
import { getMeteoraSolPool } from "./test";
import getPumpSwapStore from "./redis/pumpswap";
import { updatePumpSwap } from "./db/updatePumpSwap";
import { updatePumpFun, updateToken } from "./db/updateDbFromCache";
import { getTokenHolders } from "./filters/holders";
import { deleteStaleTokens } from "./db/deleteStaleTokens";
import { deleteFromRedis } from "./db/deleteRedisStuff";
import {
    cleanupTokens,
    deleteTransactionsWithNonExistentMints,
} from "./db/test";
import getSniperStrategyStore from "./redis/sniperStrategies";
import { updateOrderAnalytics } from "./db/updateOrderAnalytics";
import { removePendingOrders } from "./pendingDelete/removePendingOrders";
import deleteHolderFromRedis from "./db/deletePumpHolders";
import { updateTxAnalytics } from "./txnAnalytics/startProcess";
import { deleteOrphanedOrders } from "./pendingDelete/test";
const { getSolanaPrice } = require("./utils/getSolPrice");
const { sendTrendingUpdates } = require("./utils/trendingUpdates");

async function main() {
    try {
        start();
        // test();
    } catch (error: any) {
        console.log("error geting info: ", error.message);
    }
}
main();

async function start() {
    const tokenMap = await getRedisClient();
    getSolanaPrice(); //gets the sol price every minute
    // sendTrendingUpdates() // sends trending updates via pub/sub
    deleteProcess(); // delete stale tokens
    startGrpc(); // solana accounts stream
    // listenToStreamUpdates("7LSsEoJGhLeZzGvDofTdNg7M3JttxQqGWNLo6vWMpump", redis)
    updateTxProcess(); // update tx in db every minute
    updateProcess(tokenMap); // update tokens every minute
    removePendingOrdersProcess(); // remove pending orders every hour
    updateOrderAnalytics();
    updateTxAnalytics();
    deleteOrphanedOrders();
    ApiServer();
}

async function test() {
    // await removePendingOrders();
    await cleanupTokens();
    // const tokenMap = await getRedisClient();
    // removePendingOrders(tokenMap);
    // await deleteHolderFromRedis();
    // await updateToken(tokenMap); // update tokens every minute
    // fixTxProcess();
    // await updatePumpFun(tokenMap)
    // await resetCache();
    // const test = await getTokenHolders(
    //     "Eo1Er3EK6PRtDSS1TQNw4vB4FTbhbWedUPD1Ctppump",
    //     "2yh8AxqZmMN4uFgo98sT55WEo1YRsqu1NwB8iWz2ryeG"
    //   );
    //   console.log(test)
    // await deleteStaleTokens();
    // await updateToken(tokenMap)
    // await deleteFromRedis()
    // deleteTransactionsWithNonExistentMints()
    // const sniperCache = await getSniperStrategyStore();
    // const allStrategies = await sniperCache.getAllStrategies();
    // console.log(allStrategies);
    // ApiServer();
    // await updatePumpSwap()
    // updateHoldersProcess();
}

// await getRaydiumMetrics("HYfVWGbYL9XMxSyJ5ezt36UtD7KCE4zs2ixJYGewpump")
