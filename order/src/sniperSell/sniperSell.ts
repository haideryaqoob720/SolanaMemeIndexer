// import { LAMPORTS_PER_SOL } from "@solana/web3.js";
// // import { BloXRouteWrapper, quoteResponse } from "../bloxroute";
// // import getRedisClient, { RedisCache } from "../redis/store";
// // import { TokenAmount } from "@raydium-io/raydium-sdk";
// // import { updateSniperOrder } from "../db/updateSniperOrder/updateSniperOrder";
// import { getTokenAmount, sendSellTransaction } from "../onChain/sell/sell";
// // import { sniperOrderTest } from "../redis/types";
// import { config } from "../config";
// // import getPumpSwapStore from "../redis/pumpswap";
// import { pumpSwapSell } from "./pumpswapSell";
// // import { sell } from "../utils/sniperLogger"

// export async function sniperSellRaydium(
//     mint: string,
//     priceInSol: number,
//     priceInUsd: number,
//     pnl: boolean,
//     tokenMap: RedisCache,
// ) {
//     let retries = 0;
//     // const tokenMap = new RedisCache()
//     // await tokenMap.connect()

//     const blox = new BloXRouteWrapper(process.env.AUTH_HEADER ?? "");
//     // let orders:any
//     const orders = await tokenMap.readTestSniperOrder(mint);
//     const solPrice = await tokenMap.getSolPrice();
//     if (!orders) {
//         console.log(`no orders found for ${mint}`);
//         return;
//     }
//     await Promise.all(
//         orders.map(async (order, index) => {
//             let retry = true;
//             let retryCount = 0;
//             const MAX_RETRIES = 3; // Define a maximum number of retries

//             // while(retry && retryCount < MAX_RETRIES) {
//             retryCount++;
//             console.log(
//                 "in sniper sell",
//                 mint,
//                 orders.length,
//                 `retry attempt: ${retryCount}`,
//             );

//             if (!order.tokenBuyAmount.actual) {
//                 console.log(`no token buy amount for ${mint} should skip`);
//                 retry = false; // Exit the loop if there's no token buy amount
//                 // continue;
//             }

//             let quote: quoteResponse | null = null;
//             try {
//                 quote = await blox.getQuoteApi(
//                     order.mint,
//                     order.decimals,
//                     order.tokenBuyAmount.actual ??
//                         order.tokenBuyAmount.estimated ??
//                         100000000,
//                     false,
//                 );
//             } catch (error: any) {
//                 console.log(`error getting quote for ${mint}`, error.message);
//                 // Decide whether to retry based on the error
//                 if (
//                     error.message.includes("temporary") ||
//                     error.message.includes("timeout")
//                 ) {
//                     console.log("Retryable error, continuing...");
//                     // continue;
//                 } else {
//                     console.log("Non-retryable error, stopping retry loop");
//                     retry = false;
//                     // continue;
//                 }
//             }

//             if (!quote) {
//                 console.log(`no quote found for ${mint}`, quote);
//                 retry = false; // Exit the loop if no quote is found
//                 // continue;
//                 return;
//             }

//             if (order.buyingPrice === null) {
//                 console.log(`No buying price for ${mint}, skipping`);
//                 retry = false; // Exit the loop if there's no buying price
//                 // continue;
//             }
//             console.log(order, "order, before sell");
//             const sellRes = await sendSellTransaction(
//                 order.mint,
//                 order.keypair.public,
//                 order.keypair.private,
//                 quote.inAmount,
//                 order.decimals,
//                 order.isOnChain,
//                 order.buyTxHash ? true : false,
//                 order.dex,
//             );
//             console.log(sellRes, "sellres");
//             if (!sellRes) {
//                 console.log(`Sell transaction failed for ${mint}`);
//                 // Maybe retry for certain failure reasons
//                 // continue;
//                 return;
//             }
//             // if(!sellRes.tx){
//             //     continue
//             // }

//             // Update order with successful transaction data
//             order.finalPrice.sol.estimated = priceInSol;
//             order.finalPrice.usd.estimated = priceInUsd;
//             order.finalPrice.sol.actual = sellRes.price;
//             order.finalPrice.usd.actual = sellRes.price * solPrice;
//             order.sellAmount.sol.estimated = parseFloat(quote.outAmount);
//             order.sellAmount.usd.estimated =
//                 parseFloat(quote.outAmount) * solPrice;
//             // order.sellAmount.sol.actual = sellRes.outAmount
//             // order.sellAmount.usd.actual = sellRes.outAmount * solPrice
//             order.sellTime = Date.now();
//             console.log(
//                 {
//                     solBuyAmount: order.buyAmount.sol.actual,
//                     solSellAmount: sellRes.outAmount,
//                     usdBuy: order.buyAmount.usd.actual,
//                     usdSell: sellRes.outAmount * solPrice,
//                 },
//                 "sell amounts",
//             );
//             // sellLogger.info({
//             //     solBuyAmount: order.buyAmount.sol.actual,
//             //     solSellAmount: sellRes.outAmount,
//             //     usdBuy: order.buyAmount.usd.actual,
//             //     usdSell: sellRes.outAmount * solPrice,
//             // })
//             order.tokenSellAmount.estimated = quote.inAmount;
//             order.sellAmount = {
//                 sol: {
//                     estimated: parseFloat(quote.outAmount),
//                     actual: sellRes.outAmount,
//                 },
//                 usd: {
//                     estimated: parseFloat(quote.outAmount) * solPrice,
//                     actual: sellRes.outAmount * solPrice,
//                 },
//             };
//             order.sellTxHash = sellRes.tx;

//             // if(order.initialPrice.sol.actual) {
//             if (order.buyAmount.sol.actual) {
//                 // sellLogger.info("status", {buyAmount:order.buyAmount.sol.actual}, {sellAmount:sellRes.outAmount})
//                 order.status =
//                     order.buyAmount.sol.actual > sellRes.outAmount
//                         ? "profit"
//                         : "loss";
//             }
//             console.log(order);
//             await tokenMap.deleteTestSniperOrder(
//                 mint,
//                 order.userId,
//                 order.strategyId,
//             );
//             await tokenMap.addTestSniperOrder(order);
//             await updateSniperOrder(order);
//             console.log(`${mint} sold \n https://solscan.io/tx/${sellRes.tx}`);

//             const tokenBalance = await getTokenAmount(
//                 order.mint,
//                 order.keypair.public,
//             );

//             // Clear check for exiting retry loop
//             if (!tokenBalance && sellRes.tx) {
//                 console.log(
//                     "Transaction successful and no remaining balance, exiting retry loop",
//                 );
//                 retry = false;
//             } else if (tokenBalance) {
//                 console.log(
//                     `Still have token balance of ${tokenBalance}, will retry`,
//                 );
//                 // Maybe add a delay before retry
//                 await new Promise((resolve) => setTimeout(resolve, 1000));
//             } else {
//                 retry = false; // for testing, remove later
//                 console.log("Transaction unsuccessful, will retry");
//             }
//             // }

//             if (retryCount >= MAX_RETRIES) {
//                 console.log(
//                     `Maximum retry attempts (${MAX_RETRIES}) reached for ${mint}`,
//                 );
//             }
//         }),
//     );
// }

// const [mint, priceInSol, priceInUsd, pnl, orderId, dex] = process.argv.slice(2);
// process.on("message", async () => {
//     // const tokenMap = new RedisCache()
//     // await tokenMap.connect()
//     const tokenMap = await getRedisClient();
//     const pumpSwapCache = await getPumpSwapStore();
//     const spawnProcess: boolean = await tokenMap.canSpawnNewSniperProcess(
//         mint,
//         orderId,
//     );
//     if (!spawnProcess) {
//         console.log(`sniper process already running for ${mint}`);
//         // await tokenMap.disconnect()
//         process.exit();
//     }
//     await tokenMap.placeSniperProcessLock(mint, orderId);
//     if (dex === "PumpSwap") {
//         console.log("sell pumpSwap");
//         if (!mint || !priceInSol || !priceInUsd) {
//             return;
//         }
//         // await pumpSwapSell(
//         //     mint,
//         //     parseFloat(priceInSol),
//         //     parseFloat(priceInUsd),

//         // );
//     } else {
//         console.log("sell Raydium");
//         // await sniperSellRaydium(mint, parseFloat(priceInSol), parseFloat(priceInUsd), pnl === "true" ? true : false, tokenMap);
//     }
//     await tokenMap.removeSniperProcessLock(mint, orderId);

//     // await tokenMap.disconnect()
//     console.log("✅ sniper sell process completed");
//     process.exit();
// });
