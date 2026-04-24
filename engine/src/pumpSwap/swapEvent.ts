import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import getPumpSwapStore, { pumpSwapStore } from "../redis/pumpswap";
import getRedisClient, { RedisCache } from "../redis/store";
// import { BN } from "@coral-xyz/anchor";
const { BN } = require("@coral-xyz/anchor");
import { pumpswapTokens, sniperStrategies } from "@prisma/client";
import { solToWSol } from "@raydium-io/raydium-sdk-v2";
import { dexPool, pumpSwapSwapDecode, tokenHolder } from "../types";
import { TransactionFormatter } from "../utils/generalDecoder";
import { config } from "../config";
import { mintTo } from "@solana/spl-token";
import { createDefaultTransaction } from "../utils/defaultValues";
import getPoolStore, { pool } from "../redis/pools";
import { VersionedTransactionResponse } from "@solana/web3.js";
import { getPoolReserves, getPools } from "../utils/findPools";
import { bnLayoutFormatter } from "../utils/bnLayoutFormatter";
import { SolanaParser } from "@shyft-to/solana-transaction-parser";
import meteoraIdl from "../../meteora_idl.json";
import { PublicKey } from "@solana/web3.js";
import { addPoolToDbProcess } from "../db/pools/addPoolProcess";
import { sniperOrderTest } from "../redis/types";
import { createSniperSellProcess } from "../sniperSell/handleProcess";
import { Mutex } from "async-mutex";
import {
    addBN,
    convertBnToString,
    convertToBN,
    timeTaken,
} from "../utils/helpers";
import getSniperStrategyStore, {
    metricsToCheck,
    SniperStrategyStore,
} from "../redis/sniperStrategies";
import axios from "axios";
import getHolderStore, { TokenHolderStore } from "../redis/holders";
import getOrdersStore, { OrderStore } from "../redis/sniperOrders";
import { addTxToAnalytics } from "../txnAnalytics/addToRedis";
import getTxAnalytics from "../redis/txAnalytics";
import getPoolTxStore, { PoolTxStore, poolTxType } from "../redis/poolTx";
import getGeneralPoolStore, { PoolsStore } from "../redis/generalPools";
import {
    getOrderVolumeStore,
    OrderVolumeStore,
    strategyPendingVolume,
} from "../redis/orderVolume";
import { ProcessedOrdersTracker } from "./orderMap";
import {
    getNewOrderMetricsObject,
    getOrderMetricsStore,
    OrderMetricsStore,
} from "../redis/sniperOrderMetrics";
import { eventLogger } from "../utils/withdrawLogger";

// import { logWithdrawOrder } from "../orderLogger";

const tracker = ProcessedOrdersTracker.getInstance();

const decodeEvent = (
    args: any,
    solPrice: number,
    decimals: number,
    isQuote: boolean,
    mint: string,
    isBuy: boolean,
    sig: string,
    existingPump?: pumpswapTokens,
    // isWithDrawEvent?: boolean,
): pumpSwapSwapDecode | null => {
    if (!args || !args.data) {
        console.log("incomplete args: ", args);
        return null;
    }
    // if (isQuote && isBuy) {
    //     console.log(isQuote, isBuy, `https://solscan.io/tx/${sig}`);
    // } else if (isQuote && !isBuy) {
    //     console.log(isQuote, isBuy, `https://solscan.io/tx/${sig}`);
    // }
    let isLog: boolean = false;
    try {
        let txSol;
        let txToken;

        if (isQuote) {
            //check for the withdraw event first....
            // if (isWithDrawEvent) {
            //     txToken = args.data.base_amount_out;
            //     txSol = args.data.quote_amount_out;
            // } else {
            // quote token is sol and base token is mint
            if (isBuy) {
                txToken = args.data.base_amount_out;
                txSol = args.data.quote_amount_in_with_lp_fee;

                // if(mint === config.monitorToken){
                //   console.log({
                //     isBuy:isBuy,
                //     isQuote:isQuote,
                //     base_amount_out:args.data.base_amount_out,
                //     quote_amount_in_with_lp_fee:args.data.quote_amount_in_with_lp_fee
                //   })
                // }
            } else {
                // txToken = args.data.quote_amount_out_without_lp_fee;
                txToken = args.data.base_amount_in;
                // txSol = args.data.base_amount_in;
                txSol = args.data.user_quote_amount_out;

                // if(mint === config.monitorToken){
                //   console.log({
                //     isBuy:isBuy,
                //     isQuote:isQuote,
                //     quote_amount_out_without_lp_fee:args.data.quote_amount_out_without_lp_fee,
                //     base_amount_in:args.data.base_amount_in
                //   })
                // }
            }
            // }
        } else {
            //checking when quote_valut is false
            // if (isWithDrawEvent) {
            //     txToken = args.data.quote_amount_out;
            //     txSol = args.data.base_amount_out;
            // } else {
            if (isBuy) {
                txSol = args.data.base_amount_in;
                txToken = args.data.user_quote_amount_out;
                // if(mint === config.monitorToken){
                //   console.log({
                //     isBuy:isBuy,
                //     isQuote:isQuote,
                //     base_amount_out:args.data.base_amount_out,
                //     quote_amount_in_with_lp_fee:args.data.quote_amount_in_with_lp_fee
                //   })
                // }
            } else {
                // txToken = args.data.user_quote_amount_out;
                txToken = args.data.quote_amount_in_with_lp_fee;
                // txSol = args.data.base_amount_in;
                txSol = args.data.base_amount_out;
                isLog = true;
                // if(mint === config.monitorToken){
                //   console.log({
                //     isBuy:isBuy,
                //     isQuote:isQuote,
                //     user_quote_amount_out:args.data.user_quote_amount_out,
                //     base_amount_in:args.data.base_amount_in
                //   })
                // }
            }
            // }
        }

        // if(mint === config.monitorToken){
        //   console.log(txSol, txToken, "sol/token")
        // }

        // let solInTx = divideBN(isBuy ? args.data.quote_amount_in_with_lp_fee : args.data.quote_amount_out_without_lp_fee, LAMPORTS_PER_SOL, "solInTx")
        let solInTx = divideBN(txSol, LAMPORTS_PER_SOL, 9, "solInTx");
        // let tokenInTx = divideBN(isBuy ? args.data.base_amount_out : args.data.base_amount_in, Math.pow(10, decimals), "tokenInTx")
        let tokenInTx = divideBN(
            txToken,
            Math.pow(10, decimals),
            decimals,
            "tokenInTx",
        );
        let solReserve = divideBN(
            isQuote
                ? args.data.pool_quote_token_reserves
                : args.data.pool_base_token_reserves,
            LAMPORTS_PER_SOL,
            9,
            "solReserve",
        );
        let tokenReserve = divideBN(
            isQuote
                ? args.data.pool_base_token_reserves
                : args.data.pool_quote_token_reserves,
            Math.pow(10, decimals),
            decimals,
            "tokenReserve",
        );

        //withdrawEvent tester
        // if (isWithDrawEvent) {
        //     //update sol reserve and token reserve:
        //     console.log("checker: Withdraw sol and token check");
        //     console.log({
        //         sig,
        //         solInTx,
        //         tokenInTx,
        //         mint,
        //         isQuote,
        //         solReserve,
        //         tokenReserve,
        //     });
        //     return null;
        // }

        // if (isLog) {
        // console.log(
        //     mint,
        //     args.data.user.toBase58(),
        //     // txSol.toNumber(),
        //     solInTx,
        //     // txToken.toNumber(),
        //     tokenInTx,
        //     "pumpswap decode",
        //     `https://solscan.io/tx/${sig}`,
        // );
        //   isLog = false;
        // }
        const priceInSol: number = solReserve / tokenReserve;
        const priceInUsd: number = priceInSol * solPrice;
        const liquidityInSol: number = solReserve + tokenReserve * priceInSol;
        const liquidityInUsd: number =
            solReserve * solPrice + tokenReserve * priceInSol * solPrice;
        const data: pumpSwapSwapDecode = {
            mint: mint,
            isBuy: isBuy,
            holder: args.data.user.toBase58(),
            solInTx: solInTx,
            tokenInTx: tokenInTx,
            solReserve: solReserve,
            tokenReserve: tokenReserve,
            priceInSol: priceInSol,
            priceInUsd: priceInUsd,
            liquidityInSol: liquidityInSol,
            liquidityInUsd: liquidityInUsd,
            timestamp: args.data.timestamp.toNumber(),
            txTokenBn: txToken,
            txsolBn: txSol,
            signature: sig,
        };
        if (data.priceInSol > 0.1) {
            console.log(data, "high price");
        }
        if (data.tokenReserve < 100 || data.priceInSol > 0.001) {
            return null;
        }
        // if ((isQuote && isBuy) || (isQuote && !isBuy)) {
        //     console.log(data);
        // }
        return data;
    } catch (error: any) {
        console.log(
            `error decoding ${isBuy ? "buy" : "sell"} event: `,
            error.message,
        );
        return null;
    }
};

const getPoolsFromLogs = async (
    logs: string[],
    decodedTx: VersionedTransactionResponse,
    swapInfo: pumpSwapSwapDecode,
) => {
    const poolCache = await getPoolStore();
    const result: any = {};
    let meteoraPools: string[] = [];
    // Check for each DEX program in logs
    for (const [dexName, programId] of Object.entries(config.dexPrograms)) {
        const dexLogs = logs.filter(
            (log) =>
                log.includes(`Program ${programId}`) ||
                log.includes(`Program log: ${programId}`),
        );
        if (dexLogs.length > 0) {
            result[dexName] = {};
            if (dexName === "METEORA") {
                // console.log(`https://solscan.io/tx/${decodedTx.transaction.signatures[0]}`)
                const pools = getPoolsInTx(decodedTx, swapInfo.mint);
                if (pools) {
                    meteoraPools = pools;
                }
            }
        }
    }
    await Promise.all(
        meteoraPools.map(async (pool) => {
            const { sol, token } = getPoolReserves(
                decodedTx,
                pool,
                swapInfo.mint,
            );
            const newPool: pool = {
                poolAddress: pool,
                dex: "Meteora",
                mintAddress: swapInfo.mint,
                signature: decodedTx.transaction.signatures[0],
                priceInSol: swapInfo.priceInSol,
                solReserves: sol,
                tokenReserves: token,
            };
            await poolCache.addPool(swapInfo.mint, newPool);
            addPoolToDbProcess(newPool);
            // console.log("added Meteora pool to redis")
        }),
    );
};

const addTx = async (
    decoded: pumpSwapSwapDecode,
    signature: string,
    isBuy: boolean,
    tokenMap: RedisCache,
    poolTxCache: PoolTxStore,
    poolAddress: string,
    isWithDrawEvent?: boolean,
) => {
    let txData = createDefaultTransaction(
        decoded.mint,
        isBuy,
        decoded.holder,
        decoded.solInTx,
        decoded.tokenInTx,
        3,
        decoded.timestamp,
        decoded.priceInSol,
        signature,
    );
    const poolTx: poolTxType = {
        mint: decoded.mint,
        pool: poolAddress,
        isBuy: isBuy,
        solAmount: decoded.solInTx,
        tokenAmount: decoded.tokenInTx,
        dex: 3,
        user: decoded.holder,
        tokenPriceInSol: decoded.priceInSol,
        timestamp: decoded.timestamp,
        signature: signature,
    };
    if (isWithDrawEvent) {
        txData.is_liquidity_removed = true;
        poolTx.isLiquidityRemoved = true;
        console.log(
            `withdraw tx added \nhttps://solscan.io/tx/${decoded.signature}`,
        );
    }

    // console.log(txData, "txData");
    await tokenMap?.addTx(signature, txData);
    await poolTxCache.addTx(poolTx);
};

let countDebug = { mint: "", count: 0 };
const updateMakersAndVolume = async (
    decoded: pumpSwapSwapDecode,
    existingMint: any,
    signer: string,
    isBuy: boolean,
    tokenMap: RedisCache,
    holdersCache: TokenHolderStore,
) => {
    // if(decoded.mint === config.monitorToken){
    //   countDebug.mint = decoded.mint
    //   countDebug.count++;
    //   const date = new Date()
    //   console.log(countDebug, date.toISOString())
    // }
    // console.log(
    //     existingMint,
    //     decoded,
    //     addBN(
    //         convertToBN(existingMint.solVolumeBN),
    //         convertToBN(decoded.solInTx * LAMPORTS_PER_SOL),
    //     ),
    // );
    try {
        const holder: tokenHolder = {
            user: signer,
            balance: decoded.tokenInTx,
        };
        existingMint.solVolumeBN = convertBnToString(
            addBN(
                convertToBN(existingMint.solVolumeBN),
                convertToBN(decoded.solInTx * LAMPORTS_PER_SOL),
                // convertToBN(decoded.txsolBn),
            ),
        );
        existingMint.tokenVolumeBN = convertBnToString(
            addBN(
                convertToBN(existingMint.tokenVolumeBN),
                convertToBN(decoded.tokenInTx),
            ),
        );
        // console.log({
        //   solVolume: existingMint.solVolumeBN,
        //   solVolumeBN: convertToBN(existingMint.solVolumeBN),
        //   solVolumeTx: decoded.solInTx * LAMPORTS_PER_SOL,
        //   solVolumeTxBN: convertToBN(decoded.solInTx * LAMPORTS_PER_SOL),
        //   mint: decoded.mint,
        // });
        existingMint.total_tx++;
        // if(decoded.mint === config.monitorToken){
        //   const date = new Date()
        //   console.log(existingMint.total_tx, "total tx before adding in cache", date.toISOString())
        // }
        isBuy ? existingMint.buy_count++ : existingMint.sell_count++;
        // await tokenMap?.addHolder(
        //     decoded.mint,
        //     holder,
        //     isBuy,
        //     decoded.mint === config.monitorToken,
        // );
        // console.log(decoded.mint, holder.user, holder.balance, "update holder");
        await holdersCache.updateHolder(
            decoded.mint,
            holder.user,
            // holder.balance * Math.pow(10, existingMint.decimals),
            holder.balance,
            isBuy ? "buy" : "sell",
            // decoded.signature,
        );
        let newTop10: any;
        try {
            newTop10 = await holdersCache.getTop10WithPercentage(
                decoded.mint,
                // existingMint.total_supply * Math.pow(10, existingMint.decimals),
                existingMint.total_supply,
            );
        } catch (error: any) {
            console.log(
                "erorr in new top 10",
                existingMint.total_supply,
                decoded.mint,
                error.message,
            );
        }

        const allHolders = await holdersCache.getHolderCount(decoded.mint);
        // let top10 = await tokenMap?.calculateTop10(decoded.mint);
        // top10 = top10 ?? 10;
        // const totalHolders = await tokenMap?.getAllHoldersFromCache(
        //     decoded.mint,
        // );
        // existingMint.top_10_holder_equity = top10 > 100 ? 100 : top10;
        existingMint.top_10_holder_equity = newTop10?.top10HoldingPercentage
            ? newTop10?.top10HoldingPercentage
            : 7.83;
        if (existingMint.top_10_holder_equity > 100) {
            console.log(decoded.mint, existingMint.top_10_holder_equity);
        }
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const tokenCreatedAt = new Date(existingMint.creatd_at);
        // if (!top10 && tokenCreatedAt > fiveHoursAgo) {
        //     console.log(
        //         "top10",
        //         existingMint.top_10_holder_equity,
        //         existingMint.mint,
        //         "pumpSwap",
        //     );
        // }
        // existingMint.total_holders = totalHolders?.length;
        existingMint.total_holders = allHolders;
        existingMint.market_cap =
            decoded.priceInSol * parseInt(existingMint.total_supply);
        // console.log(
        //   existingMint.total_supply,
        //   existingMint.market_cap * solPrice,
        //   `https://dexscreener.com/solana/${decoded.mint}`,
        //   "marketCap"
        // );
        // if(decoded.mint ===  config.monitorToken){
        //    console.log(new Date(decoded.timestamp*1000).toISOString(), new Date().toISOString())
        // }
        // console.log(parseFloat(existingMint?.token_volume) + parseFloat(decoded.tokenInTx), parseFloat(decoded.tokenInTx), "volume")
        // existingMint.sol_volume = (parseFloat(existingMint.sol_volume) + decoded.solInTx).toString()
        // existingMint.token_volume = (parseFloat(existingMint?.token_volume) + decoded.tokenInTx)
        // if(decoded.mint === config.monitorToken){
        //   console.log("solVolume", existingMint.solVolumeBN, "solInTx", decoded.solInTx)
        //   console.log("tokenVolume", existingMint.tokenVolumeBN, "tokenInTx", decoded.tokenInTx)
        // }
        if (
            existingMint.mint === "CpY6z6QekdJzYzRm7BxDyvX23junqG8X6AGfWdFbuprd"
        ) {
            console.log(
                {
                    liquidityUsd: existingMint.liquidity_in_usd,
                    priceInUsd: existingMint.price_in_usd,
                    totalHolders: existingMint.total_holders,
                    tx: existingMint.total_tx,
                    marketCap: existingMint.market_cap,
                },
                "pumpswap token update",
            );
        }
        await tokenMap?.create(decoded.mint, existingMint, 0);
        // if(decoded.mint === config.monitorToken){
        //   const date = new Date()
        //   console.log(date.toISOString(), "after updating volume pumpswap")
        // }
    } catch (error: any) {
        console.log(
            "error updating makers and volume in pumpswap",
            error.message,
        );
        process.exit();
    }
};

const getPoolsInTx = (
    decodedTx: VersionedTransactionResponse,
    mint: string,
): string[] | null => {
    let meteoraPools: string[] = [];
    const res = decodeMeteoraTxn(decodedTx, mint);
    // console.log(res, "res")
    if (!res || res.length === 0) {
        console.log("no meteora pools found");
        return null;
    }
    return res;
};

const updatePumpToken = async (
    decoded: pumpSwapSwapDecode,
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
};

const updatePool = async (
    decoded: pumpSwapSwapDecode,
    existingPool: dexPool,
    cache: PoolsStore,
) => {
    if (!existingPool) return;
    existingPool.liquidityInSol = decoded.liquidityInSol;
    existingPool.liquidityInUsd = decoded.liquidityInUsd;
    existingPool.priceInSol = decoded.priceInSol;
    existingPool.priceInUsd = decoded.priceInUsd;
    existingPool.solReserves = decoded.solReserve.toString();
    existingPool.tokenReserves = decoded.tokenReserve.toString();
    await cache.addPool(existingPool);
};

const checkForSnipers = async (
    sniperStrategiesCache: SniperStrategyStore,
    tokenMap: RedisCache,
    orderVolumeCache: OrderVolumeStore,
    decoded: pumpSwapSwapDecode,
    market: string,
    isQuoteSol: boolean,
    strategies: sniperStrategies[] | null,
    orderVolumes: Map<string, strategyPendingVolume> | null,
    isRugged: boolean,
) => {
    if (!strategies || !orderVolumes || isRugged) return;
    const existingMint = await tokenMap.readToken(decoded.mint);
    const solPrice = await tokenMap.getSolPrice();
    const solVolume = divideBN(
        convertToBN(existingMint.solVolumeBN),
        LAMPORTS_PER_SOL,
        9,
    );
    if (solVolume === 0) {
        console.log(existingMint.solVolumeBN, "existing mint volume");
    }
    const metrics: metricsToCheck = {
        liquidityAmount: decoded.liquidityInSol,
        market_cap:
            existingMint?.total_supply ?? 100000000 * decoded.priceInUsd,
        top10HoldingPercentage: existingMint.top_10_holder_equity,
        total_tx: existingMint.total_tx,
        totalHolders: existingMint.total_holders,
        volume: solVolume * solPrice,
    };
    const filteredStrategies = await sniperStrategiesCache.matchStrategies(
        metrics,
        decoded.mint,
        strategies,
        existingMint,
    );
    if (filteredStrategies && filteredStrategies.length > 0) {
        // console.log("filteredStrategies", filteredStrategies?.length);
        try {
            // console.log(decoded.mint, decoded.priceInSol);
            // await Promise.all(
            //     filteredStrategies.map(async (strategy) => {
            //         const hasOrder = tracker.isProcessed(
            //             `${strategy.userId}:${strategy.id}:${decoded.mint}`,
            //         );
            //         const currentVolume = orderVolumes.get(
            //             `${strategy.userId}:${strategy.id}`,
            //         );
            //         const afterOrder =
            //             currentVolume?.volumePending ??
            //             0 + strategy.orderAmountInSol;
            //         // console.log(afterOrder, "afterOrder");
            //         if (afterOrder >= strategy.maxBuyVolume) {
            //             // console.log(
            //             //     "local max volume",
            //             //     afterOrder,
            //             //     strategy.maxBuyVolume,
            //             // );
            //             return;
            //         }
            //         orderVolumes.set(`${strategy.userId}:${strategy.id}`, {
            //             volumePending: afterOrder,
            //         });
            //         //   await tokenMap.getActiveOrder(
            //         //     decoded.mint,
            //         //     strategy.userId.toString(),
            //         //     strategy.id.toString(),
            //         // );
            //         if (hasOrder) {
            //             // console.log(
            //             //     "has order buy",
            //             //     `${strategy.userId}:${strategy.id}:${decoded.mint}`,
            //             // );
            //             return;
            //         }
            //         // await tokenMap.addActiveOrder(
            //         //     decoded.mint,
            //         //     strategy.userId.toString(),
            //         //     strategy.id.toString(),
            //         // );
            //         tracker.markProcessed(
            //             `${strategy.userId}:${strategy.id}:${decoded.mint}`,
            //             "active",
            //         );
            //         // if (strategy.isOnChain) {
            //         const canPlaceOrder = await orderVolumeCache.canPlaceOrder(
            //             strategy.userId.toString(),
            //             strategy.id.toString(),
            //             strategy.maxBuyVolume,
            //         );
            //         if (!canPlaceOrder) {
            //             // console.log(
            //             //     "max pending volume reached. wait for an order to complete",
            //             // );
            //             return;
            //         }

            //         //Move to order service
            //         await orderVolumeCache.updatePendingOrderVolume(
            //             strategy.userId.toString(),
            //             strategy.id.toString(),
            //             strategy.orderAmountInSol,
            //             true,
            //         );

            //         // }

            //         console.log(
            //             new Date().toUTCString(),
            //             decoded.mint,
            //             "buy order placed",
            //         );
            //         // console.log(`TestingReport:${existingMint.mint} BUY`);
            //         // console.log({
            //         //     sniper: strategy,
            //         //     dex: "PumpSwap",
            //         //     mint: existingMint.mint,
            //         //     decimals: existingMint.decimals,
            //         //     isQuoteSol: isQuoteSol,
            //         //     solPrice: solPrice,
            //         //     market: market,
            //         //     priceInSol: decoded.priceInSol,
            //         // });
            //         const res = await axios.post(
            //             "http://localhost:6000/api/buy",
            //             {
            //                 sniper: strategy,
            //                 dex: "PumpSwap",
            //                 mint: existingMint.mint,
            //                 decimals: existingMint.decimals,
            //                 isQuoteSol: isQuoteSol,
            //                 solPrice: solPrice,
            //                 market: market,
            //                 priceInSol: decoded.priceInSol,
            //             },
            //         );
            //         console.log(res.data, "pumpswap bought");
            //     }),
            // );

            //updated loop with mutex
            const globalMutex = new Mutex();
            for (const strategy of filteredStrategies) {
                // if (strategy.id === 59 || strategy.id === 43) {
                //     console.log(strategy, "after filter strategy");
                // }
                const hasOrder = tracker.isProcessed(
                    `${strategy.userId}:${strategy.id}:${decoded.mint}`,
                );
                if (hasOrder) continue;
                tracker.markProcessed(
                    `${strategy.userId}:${strategy.id}:${decoded.mint}`,
                    "active",
                );
                await globalMutex.runExclusive(async () => {
                    // Redis read - now guaranteed to see latest value
                    // const canPlaceOrder = await orderVolumeCache.canPlaceOrder(
                    //     strategy.userId.toString(),
                    //     strategy.id.toString(),
                    //     strategy.maxBuyVolume,
                    // );

                    // if (!canPlaceOrder) return;

                    // // Redis write - executed atomically with read
                    // await orderVolumeCache.updatePendingOrderVolume(
                    //     strategy.userId.toString(),
                    //     strategy.id.toString(),
                    //     strategy.orderAmountInSol,
                    //     true,
                    // );
                    const canPlaceOrder =
                        await orderVolumeCache.canPlaceAndUpdateOrder(
                            `${strategy.userId}:${strategy.id}`,
                            strategy.maxBuyVolume,
                            strategy.orderAmountInSol,
                            true,
                        );
                    if (!canPlaceOrder) {
                        // if (strategy.id === 183 || strategy.id === 43) {
                        //     console.log(
                        //         canPlaceOrder,
                        //         strategy.id,
                        //         "orderVolume",
                        //     );
                        // }
                    }

                    // console.log(
                    //     new Date().toUTCString(),
                    //     `${strategy.userId}:${strategy.id}:${decoded.mint}`,
                    //     decoded.signature,
                    //     "buy order placed",
                    // );
                    const newOrderMetrics = getNewOrderMetricsObject(
                        new Date().toISOString(),
                        strategy.isOnChain,
                    );
                    try {
                        if (strategy.isOnChain && strategy.id === 53) {
                            eventLogger.info(
                                `buy event triggered for ${strategy.userId}:${strategy.id}:${existingMint.mint}. Price: ${decoded.priceInSol}`,
                            );
                        }
                        // if (strategy.id === 53 && !isQuoteSol) {
                        const res = await axios.post(
                            "http://localhost:6000/api/buy",
                            {
                                sniper: strategy,
                                dex: "PumpSwap",
                                orderMetrics: newOrderMetrics,
                                mint: existingMint.mint,
                                decimals: existingMint.decimals,
                                isQuoteSol: isQuoteSol,
                                solPrice: solPrice,
                                market: market,
                                priceInSol: decoded.priceInSol,
                            },
                        );
                        console.log(res.data, "pumpswap bought");
                        // }
                    } catch (error) {
                        console.error("Failed to place buy order:", error);
                        // Rollback the Redis write on API failure
                        // await orderVolumeCache.updatePendingOrderVolume(
                        //     strategy.userId.toString(),
                        //     strategy.id.toString(),
                        //     -strategy.orderAmountInSol, // Negative to rollback
                        //     true,
                        // );
                    }
                });
            }
        } catch (error: any) {
            console.log("error creating order", error.message);
        }
    }
};

// const updateTrending = async(tokenMap:RedisCache, mint:string, existingMint:any, decoded:pumpSwapSwapDecode) => {
//   const trendingMetrics = await tokenMap?.getTrendingMetrics()
//     if(trendingMetrics){
//       if(decoded.liquidityInSol >= trendingMetrics.liquidityUsd){
//         await tokenMap?.addTrendingTokenToStream(mint, existingMint, raydiumCache)
//       }else if(decoded.liquidityInSol < trendingMetrics.liquidityUsd){
//         await tokenMap?.deleteTrendingToken(mint)
//       }
//     }
// }

export const handleSwapEvent = async (
    args: any,
    data: any,
    isBuy: boolean,
    logs: string[],
    strategies: sniperStrategies[] | null,
    orderVolumes: Map<string, strategyPendingVolume> | null,
    isQuoteVaultSol: boolean,
    hasArbitrage: boolean, // for debugging remove
    isWithDrawEvent?: boolean,
) => {
    const startTime = Date.now();
    const tokenMap = await getRedisClient();
    const pumpSwapCache = await getPumpSwapStore();
    const txAnalyticsCache = await getTxAnalytics();
    const holdersCache = await getHolderStore();
    const sniperStrategiesCache = await getSniperStrategyStore();
    const orderVolumeCache = await getOrderVolumeStore();
    const poolTxCache = await getPoolTxStore();
    const poolCache = await getGeneralPoolStore();
    const solPrice = await tokenMap.getSolPrice();
    const decode = new TransactionFormatter();
    const decodedTx = decode.formTransactionFromJson(
        data?.transaction,
        new Date().getTime(),
    );
    let signer: string = "";
    if (decodedTx.transaction.message.version === 0) {
        signer = decodedTx.transaction.message.staticAccountKeys[0].toBase58();
    } else {
        signer = decodedTx.transaction.message.accountKeys[0].toBase58();
    }
    const mint: string = args.mint;
    //     data?.transaction?.transaction?.meta?.preTokenBalances.find(
    //         (account: any) => account.mint !== config.solMint.toBase58(),
    //     )?.mint;
    if (!mint) {
        console.log(args.mint, args);
        console.log("❗ mint not found");
        return;
    }
    const signature: string = decodedTx.transaction.signatures[0];
    const existingToken = await tokenMap.readToken(mint);
    const existingPump = await pumpSwapCache.getToken(mint);
    const isRugged = await pumpSwapCache.hasLiquidityRemoved(mint);
    if (!existingPump || !existingToken) {
        return;
    }
    const existingPool = await poolCache.getPool(existingPump.marketAccount);

    //Checking for the withdrawEvent....
    if (isWithDrawEvent) {
        const oldSolReserve = parseFloat(existingPump.reserveSol);
        const oldTokenReserve = parseFloat(existingPump.reserveToken);
        const decoded = decodeEvent(
            args,
            solPrice,
            existingToken.decimals,
            isQuoteVaultSol,
            mint,
            false,
            signature,
            existingPump,
            // isWithDrawEvent,
        );

        if (!decoded) {
            console.log("Decoded object is undefined in withdrawEvent");
            return;
        }
        //update reserves
        const newSolReserves = oldSolReserve - (decoded?.solReserve ?? 0);
        const newTokenReserves = oldTokenReserve - (decoded?.tokenReserve ?? 0);
        const updatedDecoded = {
            ...decoded,
            solReserve: newSolReserves,
            tokenReserve: newTokenReserves,
            isBuy: false,
        };

        await updatePumpToken(updatedDecoded, existingPump, pumpSwapCache);

        await addTx(
            decoded,
            signature,
            false,
            tokenMap,
            poolTxCache,
            existingPump.marketAccount,
            isWithDrawEvent,
        );

        await addTxToAnalytics(
            decoded.mint,
            false,
            "pumpswap",
            new Date().toISOString(),
            txAnalyticsCache,
        );

        // Withdraw Event is called....
        // Calling sell ..
        const newPriceInSol = newSolReserves / newTokenReserves;
        const newPriceInUsd = newPriceInSol * solPrice;
        // console.log('withdrawEvent order');
        // console.log({
        //     signature,
        //     newSolReserves,
        //     newTokenReserves,
        //     solReserve_withdraw: decoded.solReserve,
        //     tokenReserve_withdraw: decoded.tokenReserve,
        //     oldSolReserve,
        //     oldTokenReserve,
        //     priceInSol_withdraw: decoded.priceInSol,
        //     priceInSol: newSolReserves/newTokenReserves
        // })
        await UpdateOrdersOnWithdrawEvent(
            newPriceInSol,
            decoded.mint,
            newPriceInUsd,
            solPrice,
            existingPump.marketAccount,
            sniperStrategiesCache,
            isQuoteVaultSol,
            newTokenReserves,
            newTokenReserves,
            tokenMap,
        );
        return;
    }
    const decoded = decodeEvent(
        args,
        solPrice,
        existingToken.decimals,
        isQuoteVaultSol,
        mint,
        isBuy,
        signature,
        existingPump,
    );
    if (!decoded) {
        return;
    }
    if (hasArbitrage) {
        console.log(decoded, "has arbitrage");
    }
    const results = await Promise.all([
        getPoolsFromLogs(logs, decodedTx, decoded),
        updatePumpToken(decoded, existingPump, pumpSwapCache),
        updatePool(decoded, existingPool, poolCache),
        addTx(
            decoded,
            signature,
            isBuy,
            tokenMap,
            poolTxCache,
            existingPump.marketAccount,
            isWithDrawEvent,
        ),
        addTxToAnalytics(
            decoded.mint,
            isBuy,
            "pumpswap",
            new Date().toISOString(),
            txAnalyticsCache,
        ),
        updateMakersAndVolume(
            decoded,
            existingToken,
            decoded.holder,
            isQuoteVaultSol ? isBuy : !isBuy,
            tokenMap,
            holdersCache,
        ),
        updateOrders(
            decoded.priceInSol,
            decoded.mint,
            decoded.priceInUsd,
            solPrice,
            existingPump.marketAccount,
            sniperStrategiesCache,
            isQuoteVaultSol,
            strategies,
            decoded.tokenReserve,
            decoded.solReserve,
            tokenMap,
        ),
        checkForSnipers(
            sniperStrategiesCache,
            tokenMap,
            orderVolumeCache,
            decoded,
            existingPump.marketAccount,
            isQuoteVaultSol,
            strategies,
            orderVolumes,
            isRugged,
        ),
    ]);
    // await getPoolsFromLogs(logs, decodedTx, decoded);
    // await updatePumpToken(decoded, existingPump, pumpSwapCache);
    // await addTx(
    //     decoded,
    //     signature,
    //     existingPump.isQuoteVaultSol ? isBuy : !isBuy,
    //     tokenMap,
    // );
    // await updateMakersAndVolume(
    //     decoded,
    //     existingToken,
    //     decoded.holder,
    //     decoded.isBuy,
    //     tokenMap,
    //     holdersCache,
    // );
    // await updateMakersAndVolume(
    //     decoded,
    //     existingToken,
    //     decoded.holder,
    //     existingPump.isQuoteVaultSol ? isBuy : !isBuy,
    //     tokenMap,
    //     holdersCache,
    // );
    // await updateOrders(
    //     decoded.priceInSol,
    //     decoded.mint,
    //     decoded.priceInUsd,
    //     solPrice,
    //     existingPump.marketAccount,
    //     sniperStrategiesCache,
    //     existingPump.isQuoteVaultSol,
    //     decoded.tokenReserve,
    //     decoded.solReserve,
    //     tokenMap,
    // );
    // await checkForSnipers(
    //     sniperStrategiesCache,
    //     tokenMap,
    //     decoded,
    //     existingPump.marketAccount,
    //     existingPump.isQuoteVaultSol,
    // );
    const endTime = Date.now();
    // timeTaken(startTime, endTime, "Time taken to process one tx on pumpswap");
    if (config.monitorToken === decoded.mint) {
        const token = await tokenMap.readToken(decoded.mint);
        const pumpSwap = await pumpSwapCache.getToken(decoded.mint);
        // const holders = await tokenMap.getAllHoldersFromCache(decoded.mint)
        console.log("debug data pumpswap:", {
            // token: token,
            // pumpSwap: pumpSwap,
            // totalTx: token.total_tx,
            // buyCount: token.buy_count,
            // sellCount: token.sell_count,
            // tokenVolume: token.tokenVolumeBN,
            // solVolume: token.solVolumeBN,
            // isQuote: pumpSwap?.isQuoteVaultSol,
            holders: token.total_holders,
            top10: token.top_10_holder_equity,
            // signature: `https://solscan.io/tx/${signature}`,
            // signer: decoded.holder,
            decoded: decoded,
            // args: args.data,
            // test:{
            //   isBuy:isBuy,
            //   quote_amount_in_with_lp_fee:args.data.quote_amount_in_with_lp_fee?.toString(),
            //   quote_amount_out_without_lp_fee:args.data.quote_amount_out_without_lp_fee?.toString(),
            //   base_amount_in:args.data.base_amount_in?.toString(),
            //   base_amount_out:args.data.base_amount_out?.toString()
            // }
        });
        // console.log(isBuy, pumpSwap?.isQuoteVaultSol)
        // console.log(args.data)
        // console.log(`${isBuy ? args.data.base_amount_out.toString() : args.data.base_amount_in.toString()}`)
    }
};

const METEORA_DLMM_PROGRAM_ID = new PublicKey(
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
);
const METEORA_DLMM_IX_PARSER = new SolanaParser([]);
METEORA_DLMM_IX_PARSER.addParserFromIdl(
    METEORA_DLMM_PROGRAM_ID.toBase58(),
    meteoraIdl as any,
);

function decodeMeteoraTxn(tx: VersionedTransactionResponse, mint: string) {
    let res: string[] = [];
    if (tx.meta?.err) {
        console.log("error");
        return;
    }

    // Get all accounts in the tx
    const staticAccountKeys = tx.transaction.message.staticAccountKeys;
    const writableAddresses = tx.meta?.loadedAddresses?.writable || [];
    const readonlyAddresses = tx.meta?.loadedAddresses?.readonly || [];
    const allAccountKeys = [
        ...staticAccountKeys,
        ...writableAddresses,
        ...readonlyAddresses,
    ];

    const nestedIxs = tx.meta?.innerInstructions;
    const baseIxs = tx.transaction.message.compiledInstructions;

    //check the base instructions for meteora swap
    baseIxs.map((ix) => {
        const programId = allAccountKeys[ix.programIdIndex];
        if (programId.equals(METEORA_DLMM_PROGRAM_ID)) {
            if (ix.accountKeyIndexes.length > 2) {
                // console.log({"6 account":allAccountKeys[ix.accountKeyIndexes[6]].toBase58()},{"7 account":allAccountKeys[ix.accountKeyIndexes[7]].toBase58()}, `before checking base ix for ${mint}`)
                if (
                    allAccountKeys[ix.accountKeyIndexes[6]].toBase58() ===
                        mint ||
                    allAccountKeys[ix.accountKeyIndexes[7]].toBase58() === mint
                ) {
                    const pool = allAccountKeys[ix.accountKeyIndexes[0]];
                    // console.log(pool,{"6 account":allAccountKeys[ix.accountKeyIndexes[6]].toBase58()},{"7 account":allAccountKeys[ix.accountKeyIndexes[7]].toBase58()}, "pool from base ix")
                    res.push(pool.toBase58());
                }
            }
        }
    });

    //check the nested instructions for meteora swap
    nestedIxs?.map((ix) => {
        ix.instructions.map((innerIx) => {
            const programId = allAccountKeys[innerIx.programIdIndex];
            if (programId.equals(METEORA_DLMM_PROGRAM_ID)) {
                if (innerIx.accounts.length > 2) {
                    // console.log({"6 account":allAccountKeys[innerIx.accounts[6]].toBase58()},{"7 account":allAccountKeys[innerIx.accounts[7]].toBase58()}, `before checking nested ix for ${mint}`)
                    if (
                        allAccountKeys[innerIx.accounts[6]].toBase58() ===
                            mint ||
                        allAccountKeys[innerIx.accounts[7]].toBase58() === mint
                    ) {
                        const pool = allAccountKeys[innerIx.accounts[0]];
                        // console.log(pool, "pool from inner ix")
                        res.push(pool.toBase58());
                    }
                }
            }
        });
    });
    return res;
}

function divideBN(
    numerator: any,
    divisor: number | string,
    decimals: number,
    name?: string,
): number {
    try {
        const bnValue = new BN(numerator);
        const bnDivisor = new BN(divisor);
        const quotient = bnValue.div(bnDivisor);
        const remainder = bnValue.mod(bnDivisor);
        let testDiv = quotient.toNumber();
        let testMod = remainder.toString(10);
        let inDecimals: number | null = null;
        if (testDiv === 0) {
            // console.log(testMod, "testMod");
            // console.log(testMod, decimals);
            if (testMod.length < decimals) {
                inDecimals = parseInt(testMod) / Math.pow(10, decimals);
            }
        }
        let dividedStr: string;
        if (inDecimals) {
            dividedStr = inDecimals.toString();
            // console.log(dividedStr, "divided decimals");
            return parseFloat(dividedStr);
        }
        dividedStr = `${quotient.toNumber()}.${remainder.toNumber()}`;
        // console.log(dividedStr, "pumpswap");
        // console.log(parseFloat(dividedStr), "pumpswap");
        return parseFloat(dividedStr);
    } catch (error: any) {
        console.log(
            `error dividing ${name ?? numerator.toString()}`,
            error.message,
        );
        return 0;
    }
    // let solInTx:any = args.data.max_quote_amount_in;
    // solInTx = solInTx.divmod(new BN(LAMPORTS_PER_SOL))
    // solInTx = parseFloat(`${solInTx.div.toNumber()}.${solInTx.mod.toNumber()}`).toFixed(8)
}

async function updateOrders(
    priceInSol: number,
    mint: string,
    priceInUsd: number,
    solPrice: number,
    market: string,
    sniperStrategiesCache: SniperStrategyStore,
    isQuoteSol: boolean,
    strategies: sniperStrategies[] | null,
    tokenReserve?: number,
    solReserve?: number,
    tokenMap?: RedisCache,
) {
    if (!strategies) return;
    const orderCache = await getOrdersStore();
    const orderMetricsCache = await getOrderMetricsStore();
    const sniperOrder = await orderCache.readOrdersForMint(mint);
    // console.log(sniperOrder?.length, "sniperOrderLength", mint);
    // const sniperOrder = await tokenMap?.readTestSniperOrder(mint);
    if (!sniperOrder) {
        return;
    }
    await Promise.all(
        sniperOrder.map(async (order, index) => {
            await getPnl(
                order,
                priceInSol,
                mint,
                priceInUsd,
                solPrice,
                market,
                sniperStrategiesCache,
                orderMetricsCache,
                isQuoteSol,
                tokenReserve,
                solReserve,
            );
            // await sniperSell(order.mint,  raydiumCache.price_in_sol, raydiumCache.price_in_usd, )
        }),
    );
}

async function getPnl(
    sniperOrder: sniperOrderTest,
    testPrice: number,
    mint: string,
    priceInUsd: number,
    solPrice: number,
    market: string,
    sniperStrategiesCache: SniperStrategyStore,
    orderMetricsCache: OrderMetricsStore,
    isQuoteSol: boolean,
    tokenReserve?: number,
    solReserve?: number,
    // tokenMap?: RedisCache,
) {
    const tokenMap = await getRedisClient();
    if (!sniperOrder) {
        console.log("SniperOrders Error");
        console.log(sniperOrder);
        return;
    }
    if (sniperOrder.status !== "pending") {
        return;
    }
    const profitPrice: number = sniperOrder.takeProfitPrice;
    const lossPrice: number = sniperOrder.stopLossPrice;
    const change: number =
        ((priceInUsd - sniperOrder.buyingPrice) / sniperOrder.buyingPrice) *
        100;
    const profitOrLoss: boolean =
        priceInUsd >= profitPrice
            ? true
            : priceInUsd <= lossPrice
              ? false
              : false;
    const info = {
        mint: mint,
        decodedPrice: `$${priceInUsd}`,
        buyingPrice: `$${sniperOrder.buyingPrice}`,
        profit: `$${profitPrice}`,
        loss: `$${lossPrice}`,
        change: change,
        // jupiterPrice: `$${jupiterPrice}`,
        decodedTokenReserve: tokenReserve,
        decodedSolReserves: solReserve,
        profitOrLoss: profitOrLoss,
        time: new Date().toUTCString(),
    };

    if (priceInUsd >= profitPrice || priceInUsd <= lossPrice) {
        const orderId: string = `${sniperOrder.userId}:${sniperOrder.strategyId}`;
        sniperOrder.status = profitOrLoss ? "profit" : "loss";
        const spawnProcess: boolean = await tokenMap.canSpawnNewSniperProcess(
            mint,
            orderId,
        );
        if (!spawnProcess) {
            // console.log(`sniper process already running for ${mint}`);
            return;
            // await tokenMap.disconnect()
            // process.exit();
        }
        await tokenMap.placeSniperProcessLock(mint, orderId);
        // add sell api call here
        const strategy = await sniperStrategiesCache.getStrategy(
            sniperOrder.strategyId.toString(),
        );
        // console.log(info);
        // console.log(`TestingReport:${sniperOrder.mint} SELL`);
        // console.log({
        //     order: sniperOrder,
        //     dex: "PumpSwap",
        //     mint: sniperOrder.mint,
        //     decimals: sniperOrder.decimals,
        //     solPrice: solPrice,
        //     market: market,
        //     priceInSol: priceInUsd / solPrice,
        //     isQuoteSol: isQuoteSol,
        // });
        const orderMetrics = await orderMetricsCache.getActiveMetrics(
            sniperOrder.userId,
            sniperOrder.strategyId,
            sniperOrder.mint,
        );
        orderMetrics
            ? (orderMetrics.sell.eventTriggered = new Date().toISOString())
            : null;
        if (strategy?.isOnChain) {
            eventLogger.info(
                `sell event triggered for ${sniperOrder.userId}:${sniperOrder.strategyId}:${sniperOrder.mint}`,
                info,
            );
        }
        if (sniperOrder.strategyId === 53) {
            console.log(info);
            eventLogger.info("strategy 53", info);
        }
        const res = await axios.post("http://localhost:6000/api/sell", {
            sniper: strategy,
            order: sniperOrder,
            orderMetrics: orderMetrics,
            dex: "PumpSwap",
            mint: sniperOrder.mint,
            decimals: sniperOrder.decimals,
            solPrice: solPrice,
            market: market,
            priceInSol: priceInUsd / solPrice,
            isQuoteSol: isQuoteSol,
            isWithdraw: false,
        });
        console.log(res.data, "pumpswap sold");
        //

        // let testPromises: any[] = [];
        // for (let i = 0; i < 100; i++) {
        //     const test = axios.post("http://localhost:6000/api/sell", {
        //         sniper: strategy,
        //         order: sniperOrder,
        //         dex: "PumpSwap",
        //         mint: sniperOrder.mint,
        //         decimals: sniperOrder.decimals,
        //         solPrice: solPrice,
        //         market: market,
        //         priceInSol: priceInUsd / solPrice,
        //     });
        //     testPromises.push(test);
        // }
        // console.log("sellPromises", testPromises.length);
        // await Promise.all(testPromises);

        // createSniperSellProcess(
        //     mint,
        //     testPrice,
        //     priceInUsd,
        //     profitOrLoss,
        //     `${sniperOrder.userId}:${sniperOrder.strategyId}`,
        //     "PumpSwap",
        // );
    }
}

async function UpdateOrdersOnWithdrawEvent(
    priceInSol: number,
    mint: string,
    priceInUsd: number,
    solPrice: number,
    market: string,
    sniperStrategiesCache: SniperStrategyStore,
    isQuoteSol: boolean,
    tokenReserve?: number,
    solReserve?: number,
    tokenMap?: RedisCache,
) {
    // const sniperOrder = await tokenMap?.readTestSniperOrder(mint);
    const orderCache = await getOrdersStore();
    const sniperOrder = await orderCache.readOrdersForMint(mint);
    if (!sniperOrder) {
        console.log("withdrawEvent order: Order was not bought, ", mint);
        return;
    }
    console.log(
        "withdrawEvent order: sniper orders length: ",
        sniperOrder.length,
    );
    await Promise.all(
        sniperOrder.map(async (order, index) => {
            // logWithdrawOrder(mint, priceInUsd, order);
            await sentForWithdraw(
                order,
                priceInSol,
                mint,
                priceInUsd,
                solPrice,
                market,
                sniperStrategiesCache,
                isQuoteSol,
                tokenReserve,
                solReserve,
            );
        }),
    );
}

async function sentForWithdraw(
    sniperOrder: sniperOrderTest,
    testPrice: number,
    mint: string,
    priceInUsd: number,
    solPrice: number,
    market: string,
    sniperStrategiesCache: SniperStrategyStore,
    isQuoteSol: boolean,
    tokenReserve?: number,
    solReserve?: number,
) {
    // const tokenMap = await getRedisClient();
    if (sniperOrder.status !== "pending") {
        // console.log("withdrawEvent order: Not pending order");
        return;
    }
    const info = {
        mint: mint,
        decodedPrice: `$${priceInUsd}`,
        buyingPrice: `$${sniperOrder.buyingPrice}`,
        // profit: `$${profitPrice}`,
        // loss: `$${lossPrice}`,
        // change: change,
        decodedTokenReserve: tokenReserve,
        decodedSolReserves: solReserve,
        // profitOrLoss: profitOrLoss,
        time: new Date().toUTCString(),
    };
    const orderId: string = `${sniperOrder.userId}:${sniperOrder.strategyId}`;
    sniperOrder.status = "loss";
    console.log(`selling ${orderId}:${mint} on withdraw event`);
    // const spawnProcess: boolean = await tokenMap.canSpawnNewSniperProcess(
    //     mint,
    //     orderId,
    // );
    // if (!spawnProcess) {
    //     return;
    // }
    // await tokenMap.placeSniperProcessLock(mint, orderId);
    // add sell api call here
    const strategy = await sniperStrategiesCache.getStrategy(
        sniperOrder.strategyId.toString(),
    );
    const res = await axios.post("http://localhost:6000/api/sell", {
        sniper: strategy,
        order: sniperOrder,
        dex: "PumpSwap",
        mint: sniperOrder.mint,
        decimals: sniperOrder.decimals,
        solPrice: solPrice,
        market: market,
        priceInSol: priceInUsd / solPrice,
        isQuoteSol: isQuoteSol,
    });
    console.log(res.data, "pumpswap withdraw");
}
