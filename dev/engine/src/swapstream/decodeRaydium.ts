// import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
// import idl from "../../raydium_idl.json";
// import { createProcess } from "../createToken/handleProcesses";
import { RedisCache } from "../redis/store";
// import { getBondingProgressTest, getReservesRpc } from "../test";
// import { decode } from "../raydiumDecoder/decode";
import { Liquidity, Logger, struct, u64, u8 } from "@raydium-io/raydium-sdk";
import { createDefaultTransaction } from "../utils/defaultValues";
import { TransactionFormatter } from "../utils/generalDecoder";
// import { holders } from "../filters/holders";
import { realTimeTokenMetrics, tokenHolder } from "../types";
import { RedisStream } from "../redis/stream";
// import { tokenGroupInitializeGroup, tokenMetadataUpdateField } from "@solana/spl-token";
import {
    addBN,
    convertBnToString,
    convertToBN,
    logRealTimeMetrics,
} from "../utils/helpers";
// import { updateSniperOrder } from "../db/addSniperOrder";
import { decodeRayLog } from "./rayDecoderTest";
import { sniperOrderTest, trendingTokens } from "../redis/types";
import axios from "axios";
import { BloXRouteWrapper } from "../bloxroute";
// import { sniperSellRaydium } from "../sniperSell/sniperSell";
import { createSniperSellProcess } from "../sniperSell/handleProcess";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { config } from "../config";
// import tokenCache  from "../redis/tokenStore";
const { logger } = require("../utils/logger");
// import { tOutPut } from "./rayDecoderTest";

const bs58 = require("bs58");
const { base64 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const { BorshCoder, BN } = require("@coral-xyz/anchor");

export const decodeRaydium = async (
    data: any,
    rayLog: string,
    tokenMap?: RedisCache,
    redisStream?: RedisStream,
    bloxRoute?: BloXRouteWrapper,
) => {
    if (!rayLog) return;
    // const logger = new Logger()
    //   console.log(logs, "before decoding");
    // console.log(data?.transaction?.transaction?.transaction);
    // const logs: any = data?.transaction?.transaction?.meta?.logMessages;
    // if (logs?.some((log: any) => log.includes("Program log: ray_log:"))) {
    // const shyftDecode = tOutPut(data)
    // console.log(shyftDecode, "toutput")
    // if(shyftDecode){
    //   const baseVault = shyftDecode.poolstate?.baseVault.toString();
    //   const quoteVault = shyftDecode.poolstate?.quoteVault.toString();
    //   console.log(`base: ${baseVault}, quote: ${quoteVault}`)
    // }
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
    // console.log(logs, "logs");
    // console.log(
    //   data?.transaction?.transaction?.meta?.preTokenBalances[0]?.mint,
    //   "log"
    // );
    let mint: string = "";
    // if (
    //   data?.transaction?.transaction?.meta?.preTokenBalances[0]?.mint ===
    //   "So11111111111111111111111111111111111111112"
    // ) {
    //   console.log(data?.transaction?.transaction?.meta, "preToken")
    //   mint = data?.transaction?.transaction?.meta?.preTokenBalances[1]?.mint;
    //   // console.log(mint);
    // }
    // function findNonSolMint(accounts) {
    mint = data?.transaction?.transaction?.meta?.preTokenBalances.find(
        (account: any) =>
            account.mint !== "So11111111111111111111111111111111111111112",
    )?.mint;
    // }

    // console.log(mint, "mint")
    if (!mint) {
        console.log("❗ mint not found");
    }

    // 1. Extract the correct log
    // const rayLog = logs.find((log: any) => log.includes("ray_log:"));
    // // 2. Extract the base64 data
    // const filterBs64 = rayLog.split("ray_log:")[1].trim(); // Trim whitespace
    const filterBs64 = rayLog;
    const len = Buffer.from(filterBs64, "base64").length;
    const swapBaseInLog = struct([
        u8("type"),
        u64("inn"),
        u64("out"),
        u64("direction"),
        u64("source"),
        u64("base"),
        u64("quote"),
        u64("delta"),
    ]);
    if (len === 57) {
        const decode = swapBaseInLog.decode(Buffer.from(filterBs64, "base64"));
        let existingMint = await tokenMap?.readToken(mint);
        // let existingMint = await tokenCache.readToken(mint);
        let sniperOrders = await tokenMap?.readTestSniperOrder(mint);
        let isPumpSwap: boolean = true;
        if (sniperOrders && sniperOrders.length > 0) {
            sniperOrders.map((order) => {
                if (order.dex !== "PumpSwap") {
                    isPumpSwap = false;
                }
            });
        }
        // let raydiumCache = await tokenMap?.readRayToken(mint)
        if (
            existingMint ||
            (sniperOrders &&
                sniperOrders.length > 0 &&
                sniperOrders !== undefined &&
                !isPumpSwap)
        ) {
            let raydiumCache = await tokenMap?.readRaydiumWithQuote(mint);
            // console.log(
            //   "base vault",
            //   decode.base.toString(),
            //   "quote vault",
            //   decode.quote.toString(),
            //   "mint",
            //   mint,
            //   "in am",
            //   decode.inn.toNumber(),
            //   "out am",
            //   decode.out.toNumber(),
            //   "direction",
            //   decode.direction.toNumber(),
            //   "delta",
            //   decode.delta.toNumber(),
            //   "source",
            //   decode.source.toNumber(),
            //   "sig",
            //   decodedTx.transaction.signatures[0]
            // );
            // }

            const testDecimals: number = sniperOrders
                ? sniperOrders[0].decimals
                : 1000000;
            const LAMPORTS_PER_SOL = new BN("1000000000");
            // const TOKEN_DECIMALS = new BN('1000000');
            const decimals: string =
                existingMint?.decimals?.toString() ?? testDecimals;
            const TOKEN_DECIMALS = new BN(decimals);

            const solBnTx = decode.direction.eq(new BN(1))
                ? decode.delta
                : decode.inn;

            const tokenBnTx = decode.direction.eq(new BN(1))
                ? decode.inn
                : decode.delta;

            let solAmount = decode.direction.eq(new BN(1))
                ? decode.delta
                : decode.inn;

            let tokenAmount = decode.direction.eq(new BN(1))
                ? decode.inn
                : decode.delta;

            // console.log(tokenBnTx.toString(), tokenAmount.toString())
            // const test = addBN(decode.quote, tokenBnTx, true)

            solAmount = solAmount.divmod(LAMPORTS_PER_SOL);
            tokenAmount = tokenAmount.divmod(TOKEN_DECIMALS);
            tokenAmount = parseFloat(
                `${tokenAmount.div.toString()}.${tokenAmount.mod.toString()}`,
            ).toFixed(8);
            solAmount = parseFloat(
                `${solAmount.div.toNumber()}.${solAmount.mod.toNumber()}`,
            ).toFixed(8);

            // let tempSol = decode.direction.eq(new BN(1))
            //   ? decode.base
            //   : decode.quote;
            // let tempToken = decode.direction.eq(new BN(1))
            //   ? decode.quote
            //   : decode.base;

            let sol = decode.base.divmod(LAMPORTS_PER_SOL);
            // let sol = tempSol.divmod(LAMPORTS_PER_SOL)
            sol = parseFloat(
                `${sol.div.toNumber()}.${sol.mod.toNumber()}`,
            ).toFixed(8);
            let token = decode.quote.divmod(TOKEN_DECIMALS);
            // let token = tempToken.divmod(TOKEN_DECIMALS)
            // token = parseFloat(`${token.div.toNumber()}.${token.mod.toNumber()}`).toFixed(8)
            token = parseFloat(
                `${token.div.toString()}.${token.mod.toString()}`,
            ).toFixed(8);
            // token = parseFloat(`${toSafeNumber(token.div)}.${toSafeNumber(token.mod)}`).toFixed(8)

            let testRTmetrics: any;
            let liquidity: number = 0;
            const solPriceFromCache = (await tokenMap?.getSolPrice()) ?? 0;
            // let testPrice:number = 0;
            // let priceTemp;
            if (solPriceFromCache) {
                // console.log(raydiumCache.is_quote_vault_sol)
                testRTmetrics = decodeRayLog(
                    rayLog,
                    raydiumCache?.is_quote_vault_sol ?? false,
                    solPriceFromCache,
                    parseInt(decimals),
                );

                // testPrice  = (sol / token) * solPriceFromCache
                // testPrice  = (solAmount / tokenAmount) * solPriceFromCache
                //  priceTemp = (decode.base.toNumber()/LAMPORTS_PER_SOL) / (decode.quote.toNumber()/10 ** parseInt(decimals)) * solPriceFromCache

                // console.log(testPrice, sol, token)
                //  liquidity = (token * testPrice) + (sol * solPriceFromCache)
            }
            solAmount = parseFloat(solAmount.toString()).toFixed(8);
            tokenAmount = parseFloat(tokenAmount.toString()).toFixed(9);
            if (raydiumCache) {
                // raydiumCache.liquidity_in_sol = liquidity / solPriceFromCache
                raydiumCache.liquidity_in_sol =
                    testRTmetrics?.metrics.liquidity.sol;
                // raydiumCache.liquidity_in_usd = liquidity
                raydiumCache.liquidity_in_usd =
                    testRTmetrics?.metrics.liquidity.usd;
                // raydiumCache.price_in_sol = testPrice / solPriceFromCache
                raydiumCache.price_in_sol = testRTmetrics?.metrics.price.sol;
                // raydiumCache.price_in_usd = testPrice
                raydiumCache.price_in_usd = testRTmetrics?.metrics.price.usd;
                // raydiumCache.reserve_sol = parseFloat(sol)
                raydiumCache.reserve_sol = raydiumCache.is_quote_vault_sol
                    ? testRTmetrics?.quote
                    : testRTmetrics?.base;
                // raydiumCache.reserve_token = parseFloat(token)
                raydiumCache.reserve_token = !raydiumCache.is_quote_vault_sol
                    ? testRTmetrics?.quote
                    : testRTmetrics?.base;
                // console.log(raydiumCache.is_quote_vault_sol, raydiumCache.reserve_sol, raydiumCache.reserve_token, "before")

                if (
                    parseFloat(raydiumCache.reserve_sol) >
                    parseFloat(raydiumCache.reserve_token)
                ) {
                    let temp = raydiumCache.reserve_sol;
                    raydiumCache.reserve_sol = raydiumCache.reserve_token;
                    raydiumCache.reserve_token = temp;
                    raydiumCache.is_quote_vault_sol =
                        !raydiumCache.is_quote_vault_sol;
                }

                // console.log(raydiumCache.is_quote_vault_sol, raydiumCache.reserve_sol, raydiumCache.reserve_token)
                await tokenMap?.create(mint, raydiumCache, 2);
                const trendingMetrics = await tokenMap?.getTrendingMetrics();
                if (trendingMetrics) {
                    if (
                        raydiumCache.liquidity_in_usd >=
                        trendingMetrics.liquidityUsd
                    ) {
                        await tokenMap?.addTrendingTokenToStream(
                            mint,
                            existingMint,
                            raydiumCache,
                        );
                        // console.log(`added ${mint} to trending, liquidity: ${raydiumCache.liquidity_in_usd}/${trendingMetrics.liquidityUsd}`)
                    } else if (
                        raydiumCache.liquidity_in_usd <
                        trendingMetrics.liquidityUsd
                    ) {
                        await tokenMap?.deleteTrendingToken(mint);
                        // console.log(`removed ${mint} from trending, liquidity: ${raydiumCache.liquidity_in_usd}/${trendingMetrics.liquidityUsd}`)
                    }
                }

                const tokenMetrics: realTimeTokenMetrics = {
                    liquiditySol: raydiumCache.liquidity_in_sol,
                    liquidityUsd: raydiumCache.liquidity_in_usd,
                    priceSol: raydiumCache.price_in_sol,
                    priceUsd: raydiumCache.price_in_usd,
                    reserveSol: raydiumCache.reserve_sol,
                    reserveToken: raydiumCache.reserve_token,
                };
                const sniperOrder = await tokenMap?.readTestSniperOrder(mint);
                if (!sniperOrder) {
                    // console.log("no orders")
                    return;
                }
                await Promise.all(
                    sniperOrder.map(async (order, index) => {
                        await getPnl(
                            order,
                            testRTmetrics?.metrics.price.sol,
                            mint,
                            testRTmetrics?.metrics.price.usd,
                            token,
                            sol,
                            tokenMap,
                        );
                        // await sniperSell(order.mint,  raydiumCache.price_in_sol, raydiumCache.price_in_usd, )
                    }),
                );
                // if(existingMint.mint === '7jBupjHoQNifegHM7BzkpgDkUpnW1oCE1kZLABwyti9Q'){
                // if(existingMint.mint){

                console.log(testRTmetrics);
                console.log({
                    sig: `https://solscan.io/tx/${decodedTx.transaction.signatures[0]}`,
                    direction: decode.direction,
                    // txSol: solAmount,
                    // txToken: tokenAmount,
                    // sol: sol,
                    // token: token,
                    // decimals: decimals,
                    tokenMietrics: tokenMetrics,
                    // solTemp: decode.base.toNumber()/LAMPORTS_PER_SOL,
                    // tokenTemp:decode.quote.toNumber()/10 ** parseInt(decimals),
                    // price: priceTemp
                });
                // }
                logRealTimeMetrics(mint, tokenMetrics, "raydium");
                await tokenMap?.tokenUpdatePub(mint, tokenMetrics);
                // const stream = await redisStream?.streamExist(mint)
                // if(!stream){
                //   console.log(mint, "created stream")
                // redisStream?.createTokenStream(mint)
                // }
                // redisStream?.writeToStream(mint, tokenMetrics)
            }

            if (sniperOrders && sniperOrders.length > 0 && !raydiumCache) {
                const sniperOrder = await tokenMap?.readTestSniperOrder(mint);
                if (!sniperOrder) {
                    // console.log("no orders")
                    return;
                }
                await Promise.all(
                    sniperOrder.map(async (order, index) => {
                        if (order.buyingPrice === null) {
                            // await getPnl(order, testRTmetrics?.metrics.price.sol, mint, testRTmetrics?.metrics.price.usd, token, sol)
                            order.buyingPrice =
                                testRTmetrics?.metrics.price.usd;
                            order.takeProfitPrice =
                                order.takeProfitPrice *
                                testRTmetrics?.metrics.price.usd;
                            order.stopLossPrice =
                                order.stopLossPrice *
                                testRTmetrics?.metrics.price.usd;
                            logger.info(
                                {
                                    buyingPrice: order.buyingPrice,
                                    takeProfitPrice: order.takeProfitPrice,
                                    stopLossPrice: order.stopLossPrice,
                                },
                                "first tx after order",
                            );
                            await tokenMap?.deleteTestSniperOrder(
                                mint,
                                order.userId,
                                order.strategyId,
                            );
                            await tokenMap?.addTestSniperOrder(order);
                        }
                    }),
                );
            }

            if (existingMint) {
                const holder: tokenHolder = {
                    user: signer,
                    balance: tokenAmount,
                };
                const isBuy: boolean =
                    decode.direction.toNumber() === 1 ? false : true;
                await tokenMap?.addHolder(mint, holder, isBuy);
                const top10 = await tokenMap?.calculateTop10(mint);
                // console.log(holder, top10, "holders")
                // console.log(parseFloat(existingMint?.token_volume) + parseFloat(tokenAmount), parseFloat(tokenAmount), "volume")
                existingMint.top_10_holder_equity = top10;
                isBuy ? existingMint.buy_count++ : existingMint.sell_count++;
                // existingMint.sol_volume = (parseFloat(existingMint.sol_volume) + solAmount).toString()
                // add the ture paramenter at the end to the addBN function for console logs
                existingMint.solVolumeBN = convertBnToString(
                    addBN(
                        convertToBN(existingMint.solVolumeBN ?? "0"),
                        solBnTx,
                    ),
                );
                // existingMint.token_volume = (parseFloat(existingMint?.token_volume) + parseFloat(tokenAmount))
                existingMint.tokenVolumeBN = convertBnToString(
                    addBN(
                        convertToBN(existingMint?.tokenVolumeBN ?? "0"),
                        tokenBnTx,
                    ),
                );

                // console.log(existingMint.solVolumeBN, existingMint.tokenVolumeBN, "solVolume, tokenVolume")
                existingMint.total_tx++;

                await tokenMap?.create(mint, existingMint, 0);
                // await tokenCache.create(mint, existingMint, 0)

                try {
                    if (testRTmetrics) {
                        let txData = createDefaultTransaction(
                            mint,
                            isBuy,
                            signer,
                            solAmount,
                            tokenAmount,
                            2,
                            Math.floor(new Date().getTime() / 1000),
                            testRTmetrics.metrics.price.sol,
                            decodedTx.transaction.signatures[0],
                        );
                        await tokenMap?.addTx(
                            decodedTx.transaction.signatures[0],
                            txData,
                        );
                    }

                    //check for sniper order

                    //sniper order login was here

                    // getPnl(sniperOrder, testPrice, mint)
                } catch (error: any) {
                    console.log("error adding tx, decode", error.message);
                }
            }
        } else {
            // console.log("mint not found in cache, raydium tx");
        }
    }
    // if(config.monitorToken === mint){
    //       const token = await tokenMap?.readToken(mint)
    //       const pumpSwap = await tokenMap?.readRayToken(mint)
    //       const holders = await tokenMap?.getAllHoldersFromCache(mint)
    //       console.log("debug data Raydium:", {
    //         token: token,
    //         pumpSwap: pumpSwap,
    //         holders: holders,
    //         signature: `https://solscan.io/tx/${decodedTx.transaction.signatures[0]}`
    //       })
    //     }
    // } else {
    //   if (
    //     logs?.some((log: any) =>
    //       log.includes("Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8")
    //     )
    //   ) {
    //     // console.log(logs)
    //   }
    // }
};

async function getPnl(
    sniperOrder: sniperOrderTest,
    testPrice: number,
    mint: string,
    priceInUsd: number,
    tokenReserve?: number,
    solReserve?: number,
    tokenMap?: RedisCache,
) {
    // const profitPrice:number = sniperOrder.buyingPrice * 1.1
    // if(sniperOrder.buyingPrice === null && sniperOrder.status === "pending") {
    //   sniperOrder.buyingPrice = priceInUsd
    //   sniperOrder.takeProfitPrice = sniperOrder.takeProfitPrice * priceInUsd
    //   sniperOrder.stopLossPrice = sniperOrder.stopLossPrice * priceInUsd
    //   logger.info({buyingPrice:sniperOrder.buyingPrice, takeProfitPrice:sniperOrder.takeProfitPrice, stopLossPrice: sniperOrder.stopLossPrice}, "first tx after sniperOrder")
    //   await tokenMap?.deleteTestSniperOrder(mint, sniperOrder.userId, sniperOrder.strategyId)
    //   await tokenMap?.addTestSniperOrder(sniperOrder)
    //   console.log("no buying Price");
    //   return
    // }
    if (sniperOrder.status !== "pending") {
        return;
    }
    const profitPrice: number = sniperOrder.takeProfitPrice;
    // console.log(sniperOrder, "sniperOrder")
    // const lossPrice:number = sniperOrder.buyingPrice * 0.95
    // const change:number = ((testPrice - sniperOrder.buyingPrice ) / sniperOrder.buyingPrice) * 100;
    // const profitOrLoss:boolean = testPrice >= profitPrice ? true : testPrice <= lossPrice ? false : false

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

    // if(testPrice >= profitPrice || testPrice <= lossPrice){
    if (priceInUsd >= profitPrice || priceInUsd <= lossPrice) {
        // const jupiterPrice = await getTokenPriceFromJup(mint)
        const info = {
            mint: mint,
            decodedPrice: `$${testPrice}`,
            buyingPrice: `$${sniperOrder.buyingPrice}`,
            profit: `$${profitPrice}`,
            loss: `$${lossPrice}`,
            change: change,
            // jupiterPrice: `$${jupiterPrice}`,
            decodedTokenReserve: tokenReserve,
            decodedSolReserves: solReserve,
            profitOrLoss: profitOrLoss,
        };
        // logger.info(`${testPrice}, ${jupiterPrice},${mint}, ${profitOrLoss}`)
        logger.info(info, { sniperOrder: sniperOrder });
        // await sniperSell(mint, testPrice, priceInUsd, profitOrLoss)
        sniperOrder.status = profitOrLoss ? "profit" : "loss";
        // await tokenMap?.addTestSniperOrder(sniperOrder)
        createSniperSellProcess(
            mint,
            testPrice,
            priceInUsd,
            profitOrLoss,
            `${sniperOrder.userId}:${sniperOrder.strategyId}`,
            "Raydium",
        );
        // console.log(testPrice, jupiterPrice, "compare prices pnl")
        // await updateSniperOrder(sniperOrder.mint, sniperOrder.userId, sniperOrder.strategyId, profitOrLoss)
        // await tokenMap?.deleteSniperOrder(mint, sniperOrder.userId, sniperOrder.strategyId)
        // await tokenMap?.deleteMintFromSniperOrder(mint)
        // console.log(info, "compare prices pnl")
        // console.log(`sell ${mint} for ${testPrice >= profitPrice ? "profit" : testPrice <= lossPrice ? "loss" : ""} on price ${testPrice} SOL\nChange: ${change.toFixed(2)}%`)
    } else {
        // console.log("in price range")
    }
}

const getTokenPriceFromJup = async (mint: string): Promise<number> => {
    try {
        const res = await axios.get(
            `https://api.jup.ag/price/v2?ids=${mint},So11111111111111111111111111111111111111112`,
        );
        console.log(res.data);
        if (res.data?.data[mint]?.price) {
            return res.data.data[mint].price;
        } else {
            console.log(res.data);
            return 0;
        }
    } catch (error: any) {
        console.log("error getting price from jupiter", mint, error.message);
        return 0;
    }
};

function toSafeNumber(remainder: any) {
    if (remainder.lte(Number.MAX_SAFE_INTEGER)) {
        return remainder;
    }
    // return Number.MAX_SAFE_INTEGER
    let res = Number.MAX_SAFE_INTEGER;
    try {
        res = remainder.toNumber();
    } catch (err) {
        console.log("number greater than max safe number");
    }
    return res;
}
