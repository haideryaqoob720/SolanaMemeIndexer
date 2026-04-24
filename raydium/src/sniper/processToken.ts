import {
    PublicKey,
    LAMPORTS_PER_SOL,
    SYSVAR_EPOCH_SCHEDULE_PUBKEY,
} from "@solana/web3.js";
import {
    decodeMigrationTx,
    migratedToken,
} from "../swapstream/decodeFeeAccount";
import { getAllMetrics, getMintInfo } from "../filters/filters";
import { TokenBuyAnalyzer } from "../bundleChecker/bundleCheck";
import { RaydiumAmmParser } from "../swapstream/rayParser";
import { getSnipersFromDb } from "../db/getSnipers";
import axios from "axios";
import { parseTokenInfo } from "@raydium-io/raydium-sdk-v2";
import { config } from "../config";
import { log } from "winston";
import { sniperStrategies } from "@prisma/client";
import { getTokenHolders } from "../filters/holders";
import { BloXRouteWrapper } from "../bloxroute";
import { SniperStore } from "../redis/sniperStore";
import { sniperOrder } from "../types";
import { createSniperOrderProcess } from "../db/addSniperOrder/handleProcess";
import { sendBuyTransaction } from "../onChain/buy/buy";
import { JupiterSwap } from "./jupiterSwap";
import { testRoutesRaydium } from "./compareSniperMetrics";
// import {snipperLogger} from "../utils/logger"

const MIN_LP_AMOUNT: number = 78;
const MAX_TOP_HOLDERS_PERCENTAGE: number = 80;
const MAX_BUNDLE_CHECKER_PERCENTAGE = 300;

interface snipe {
    shouldSnipe: boolean;
    mint?: string;
}

export const processMigratedToken = async (
    data: any,
    bundleChecker: TokenBuyAnalyzer,
    RAYDIUM_PARSER: RaydiumAmmParser,
    bloxRoute: BloXRouteWrapper,
    cache: SniperStore,
    sniperActive: boolean,
): Promise<snipe> => {
    const token = decodeMigrationTx(data, RAYDIUM_PARSER);
    const stepOne = Date.now();
    if (!token) return { shouldSnipe: false };
    if (!sniperActive) {
        const metadata = await fetchTokenMetadata(new PublicKey(token.mint));
        console.log("migrating token");
        await migrateToken(token, [], metadata, []);
        return { shouldSnipe: true, mint: token.mint };
    }
    // const metrics = await getAllMetrics(token.mint, token.creator, token.solVault, token.tokenVault)

    //get metrics
    let metrics: {
        top10holderEquity: number | undefined;
        mintable: boolean | undefined;
        freezeable: boolean | undefined;
        decimals: number;
    } = {
        top10holderEquity: undefined,
        mintable: undefined,
        freezeable: undefined,
        decimals: 1,
    };
    const mintInfo = await getMintInfo(new PublicKey(token.mint));
    const top10 = await getTokenHolders(token.mint, token.creator);
    metrics.mintable = mintInfo?.mintAuthority ? true : false;
    metrics.freezeable = mintInfo?.freezeAuthority ? true : false;
    metrics.top10holderEquity =
        top10.top10Equity > 100 ? 98 : top10.top10Equity;
    metrics.decimals = mintInfo?.decimals;

    //get bundle buys
    const analyzeBuys = await bundleChecker.analyzeBuys(
        token.mint,
        token.blockNumber,
    );
    let initialLiquidity: number = 0;
    if (!metrics) return { shouldSnipe: false, mint: token.mint };
    const meetsConstantCriteria =
        token.liquidityInSol >= MIN_LP_AMOUNT &&
        (metrics.top10holderEquity ?? 100) <= MAX_TOP_HOLDERS_PERCENTAGE &&
        //   event.topSingleOwningPercentage <= this.MAX_INDIVIDUAL_HOLDER_PERCENTAGE &&
        !metrics.mintable &&
        !metrics.freezeable &&
        analyzeBuys.percentageOfTotalSupply <= MAX_BUNDLE_CHECKER_PERCENTAGE;

    // console.log(metrics, analyzeBuys, "\nprice: ")
    //get snipers from db after getting token metrics
    // const tokenPriceInUsd = await getTokenPriceFromJup(token.mint)
    // const quote = await bloxRoute.getQuote(token.mint, 400000000, true, "Jupiter")

    const stepTwo = Date.now();
    timeTaken(stepOne, stepTwo, "1. sniping metrics");
    const solPrice = await cache.getSolPrice();
    const snipers = await getSnipersFromDb(
        token.liquidityInSol,
        metrics.top10holderEquity ?? 100,
        analyzeBuys.percentageOfTotalSupply,
        metrics.mintable,
        metrics.freezeable,
    );
    console.log(snipers, "snipers from db");
    if (snipers && snipers.length > 0) {
        console.log(`found ${snipers.length} snipers`);
        // const blox = await bloxRoute.getQuoteApi(token.mint, 400000000, true)
        // console.log(blox, "blox")
        const newOrders = await postSnipersToRaydium(
            snipers,
            token,
            metrics.decimals,
            solPrice,
            bloxRoute,
            cache,
        );
        if (newOrders.length > 0) {
            console.log("orders created");
        }
        const stepThree = Date.now();
        timeTaken(stepTwo, stepThree, "2. create orders");
        if (newOrders) {
            const metadata = await fetchTokenMetadata(
                new PublicKey(token.mint),
            );
            console.log("migrating token");
            await migrateToken(token, [], metadata, newOrders);
            console.log("migrated token");
            const stepFour = Date.now();
            timeTaken(stepThree, stepFour, "3. migrate token");
        }
    } else {
        if (!meetsConstantCriteria) {
            console.log("Event Rejected: Does not meet snipe criteria.");
            //   if (this.debug) {
            console.log("Rejection Details:", {
                poolAmount:
                    token.liquidityInSol < MIN_LP_AMOUNT
                        ? `✖️ Not enough liquidity: ${token.liquidityInSol}`
                        : `✅ has liquidity: ${token.liquidityInSol}`,
                top10HoldingPercentage:
                    (metrics.top10holderEquity ?? 100) >
                    MAX_TOP_HOLDERS_PERCENTAGE
                        ? `✖️ High top holder concentration: ${
                              metrics.top10holderEquity ?? 100
                          }`
                        : `✅ acceptable top holder concentration: ${
                              metrics.top10holderEquity ?? 100
                          }`,
                //   topSingleOwningPercentage: event.topSingleOwningPercentage > this.MAX_INDIVIDUAL_HOLDER_PERCENTAGE ? "High single holder concentration" : null,
                mintable: metrics.mintable
                    ? "✖️ creator can mint new tokens"
                    : "✅ not mintable",
                freezeable: metrics.freezeable
                    ? "✖️ creator can freeze tokens"
                    : "✅ not freezeable",
                BundleDetails: {
                    bundlePercentage: analyzeBuys.percentageOfTotalSupply,
                    maxAllowed: MAX_BUNDLE_CHECKER_PERCENTAGE,
                },
            });
            //   }
            return { shouldSnipe: false, mint: token.mint };
        }
        const meetsBundleCheckerCriteria =
            analyzeBuys.percentageOfTotalSupply <=
            MAX_BUNDLE_CHECKER_PERCENTAGE;

        if (!meetsBundleCheckerCriteria) {
            console.log("Event Rejected: Does not meet bundle criteria.");
            //   if (this.debug) {
            console.log("Bundle Details:", {
                bundlePercentage: analyzeBuys.percentageOfTotalSupply,
                maxAllowed: MAX_BUNDLE_CHECKER_PERCENTAGE,
            });
            //   }
            return { shouldSnipe: false, mint: token.mint };
        }
    }
    console.log(snipers, "no snipers found for this token");
    // sniperLogger.info(`☑️ snipe ${token.mint} at ${tokenPriceInUsd} SOL`)
    return { shouldSnipe: true, mint: token.mint };
};

// const getTokenPriceFromJup = async(mint:string):Promise<number> =>{
//   try {

//     const res = await axios.get(`https://api.jup.ag/price/v2?ids=${mint},So11111111111111111111111111111111111111112`)
//     console.log(res.data)
//     if(res.data?.data[mint]?.price){
//       return res.data.data[mint].price
//     }else{
//       console.log(res.data)
//       return 0
//     }
//   } catch (error:any) {
//     console.log("error getting price from jupiter",mint, error.message)
//     return 0
//   }
// }

export const getTokenPriceFromJup = async (
    mint: string,
    orderSizeInLamports: number = 100000000,
    maxRetries: number = 3,
    delayMs: number = 2000,
): Promise<number> => {
    let retries = 0;

    // Helper function to create a delay
    const delay = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    // Try to get the price, with retries
    while (retries <= maxRetries) {
        try {
            const res = await axios.get(
                `https://api.jup.ag/price/v2?ids=${mint},So11111111111111111111111111111111111111112`,
            );
            //       const quoteFromJupiter = await axios.get(`https://quote-api.jup.ag/v6/quote?inputMint=${config.solMint.toBase58()}&outputMint=${mint}&amount=${orderSizeInLamports}&slippageBps=1000`)

            // const outAmount = quoteFromJupiter.data.outAmount
            // const inAmount = quoteFromJupiter.data.inAmount
            // const swapUsdValue = quoteFromJupiter.data.swapUsdValue

            // console.log(outAmount, inAmount, swapUsdValue, "quoteFromJupiter")

            console.log(`Attempt ${retries + 1}:`, res.data);

            if (res.data?.data[mint]?.price) {
                const price = res.data.data[mint].price;

                // If price is 0 and we haven't exhausted retries, try again
                if (price === 0 && retries < maxRetries) {
                    retries++;
                    delayMs = delayMs * retries;
                    console.log(
                        `Price is 0, retrying after ${delayMs}ms... (${retries}/${maxRetries})`,
                    );
                    await delay(delayMs);
                    continue;
                }

                return parseFloat(price);
            } else {
                console.log(`No price data found for mint ${mint}`);

                // If we haven't exhausted retries, try again
                if (retries < maxRetries) {
                    console.log(
                        `Retrying after ${delayMs}ms... (${retries + 1}/${maxRetries})`,
                    );
                    retries++;
                    await delay(delayMs);
                    continue;
                }

                return 0;
            }
        } catch (error: any) {
            console.log(
                `Error getting price from Jupiter for ${mint}:`,
                error.message,
            );
            console.log(`https://quote-api.jup.ag/v6/quote?inputMint=${config.solMint.toBase58()}
&outputMint=${mint}
&amount=${orderSizeInLamports}
&slippageBps=1000`);

            // If we haven't exhausted retries, try again
            if (retries < maxRetries) {
                console.log(
                    `Retrying after ${delayMs}ms... (${retries + 1}/${maxRetries})`,
                );
                retries++;
                await delay(delayMs);
                continue;
            }

            return 0;
        }
    }

    // This line should never be reached due to the returns inside the loop
    // but TypeScript requires a return statement at the end
    return 0;
};

const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);
async function fetchTokenMetadata(mint: PublicKey) {
    const metadataPDA = getMetadataPDA(mint);
    const accountInfo = await config.connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
        return null;
    }

    const rawData = accountInfo.data;

    // helper to strip UTF-8 null-terminators
    function bufferToString(buf: Buffer) {
        return buf.toString("utf8").replace(/\0/g, "").trim();
    }

    // Adjust offset based on Metaplex metadata layout
    let offset = 1 + 32 + 32; // key + update auth + mint (rough example)

    const nameLen = rawData.readUInt32LE(offset);
    offset += 4;
    const name = bufferToString(rawData.subarray(offset, offset + nameLen));
    offset += nameLen;

    const symbolLen = rawData.readUInt32LE(offset);
    offset += 4;
    const symbol = bufferToString(rawData.subarray(offset, offset + symbolLen));
    offset += symbolLen;

    const uriLen = rawData.readUInt32LE(offset);
    offset += 4;
    const uri = bufferToString(rawData.subarray(offset, offset + uriLen));
    offset += uriLen;

    return { name, symbol, uri };
}
function getMetadataPDA(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        MPL_TOKEN_METADATA_PROGRAM_ID,
    )[0];
}

async function migrateToken(
    token: migratedToken,
    newOrders: any,
    metadata: any,
    sniperOrders: any,
) {
    try {
        await axios.post(
            // "https://websocket.lamboradar.com:5000/sniper/migrate",
            process.env.MONITOR_SERVER
                ? `${process.env.MONITOR_SERVER}/sniper/migrate`
                : "https://websocket.lamboradar.com:5000/sniper/migrate",
            {
                mint: token.mint,
                creator: token.creator,
                liquidityInSol: token.liquidityInSol,
                solAddress: token.parseInfo.pool_pc_token_account,
                tokenAddress: token.parseInfo.pool_coin_token_account,
                parseInfo: token.parseInfo,
                newOrders: newOrders,
                metadata: metadata,
                quoteIsSol: token.quoteIsSol,
                market: token.poolAddress,
                baseVault: token.quoteIsSol ? token.tokenVault : token.solVault,
                quoteVault: token.quoteIsSol
                    ? token.solVault
                    : token.tokenVault,
                // sniper: sniper,
                // buyingPrice: tokenPriceInUsd,
                // profit: sniper.profit * tokenPriceInUsd,
                // stopLoss: sniper.stopLoss * tokenPriceInUsd
            },
        );
        console.log(`migrated ${token.mint}`);
        sniperOrders.map((order: any) => {
            createSniperOrderProcess(
                order,
                order.userId.toString(),
                order.strategyId.toString(),
            );
        });
        await Promise.all(
            sniperOrders.map(async (order: any) => {
                await testRoutesRaydium(
                    token.mint,
                    order.decimals,
                    order.buyAmount.sol.actual * LAMPORTS_PER_SOL,
                    order.keypair.public,
                );
            }),
        );
        console.log(`created ${sniperOrders.length} sniper orders`);
    } catch (error: any) {
        console.log("Error migrating token", error.message);
    }
}

async function postSnipersToRaydium(
    snipers: any,
    token: any,
    decimals: number,
    solPrice: number,
    blox: BloXRouteWrapper,
    cache: SniperStore,
) {
    // token.mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    // if (snipers.length === 0) {return}
    let fees: number = 100000;
    let newOrders: any[] = [];
    await Promise.all(
        snipers.map(async (sniper: any) => {
            console.log(sniper, "snipers");
            // snipers.map(async(sniper) => {
            //amount in usd change in db later
            const amountInLamports = Math.floor(
                (sniper.orderAmountInSol / solPrice) * LAMPORTS_PER_SOL,
            );
            console.log(sniper.orderAmountInSol, solPrice, amountInLamports);
            // const jupiterQuote = await getTokenPriceFromJup(token.mint, sniper.orderAmountInSol * LAMPORTS_PER_SOL)
            const bloxQuote = await blox.getQuoteApi(
                token.mint,
                decimals,
                amountInLamports,
                true,
            );
            // console.log(blox, "bloxQuote")
            try {
                console.log({
                    sniperProfit: sniper.profit,
                    sniperLoss: sniper.stopLoss,
                    // price: tokenPriceInUsd,
                    orderAmount: sniper.orderAmountInSol,
                    // profitPrice: sniper.profit * tokenPriceInUsd,
                    // lossPrice: sniper.stopLoss * tokenPriceInUsd,
                    bloxQuote: bloxQuote,
                });

                if (!bloxQuote) {
                    return;
                }
                if (bloxQuote.priceSol < 0 || bloxQuote.priceSol === 0) {
                    console.log(
                        "error getting price from jupiter, skipping token",
                        token.mint,
                        bloxQuote.priceSol,
                    );
                    return;
                }
                if (!sniper.profit || !sniper.stopLoss) {
                    return;
                }
                const buyRes = await sendBuyTransaction(
                    token.mint,
                    sniper.user.user_wallets.public_key,
                    sniper.user.user_wallets.private_key,
                    bloxQuote.inAmount,
                    sniper.isOnChain ?? false,
                    "Jupiter",
                    fees,
                );
                if (!buyRes) {
                    return;
                }
                // if(!buyRes || !buyRes.tx){
                //   return
                // }
                const order: sniperOrder = {
                    buyTime: Date.now(),
                    mint: token.mint,
                    strategyId: sniper.id,
                    userId: sniper.userId,
                    decimals: decimals,
                    dex: "Raydium",
                    route: "Jupiter",
                    txFees: fees / LAMPORTS_PER_SOL,
                    keypair: {
                        public: sniper.user.user_wallets.public_key,
                        private: sniper.user.user_wallets.private_key,
                    },
                    isOnChain: sniper.isOnChain,
                    orderAmountInUsd: sniper.orderAmountInSol, //is usd name will be changed
                    // buyingPrice: bloxQuote.priceSol * solPrice,
                    buyingPrice: buyRes.price * solPrice,
                    initialPrice: {
                        sol: {
                            actual: buyRes.price,
                            estimated: null,
                        },
                        usd: {
                            actual: buyRes.price * solPrice,
                            estimated: null,
                        },
                    },
                    finalPrice: {
                        sol: {
                            actual: null,
                            estimated: null,
                        },
                        usd: {
                            actual: null,
                            estimated: null,
                        },
                    },
                    buyAmount: {
                        sol: {
                            estimated: amountInLamports / LAMPORTS_PER_SOL,
                            actual: amountInLamports / LAMPORTS_PER_SOL,
                        },
                        usd: {
                            estimated: sniper.orderAmountInSol,
                            actual: sniper.orderAmountInSol,
                        },
                    },
                    sellAmount: {
                        sol: {
                            estimated: null,
                            actual: null,
                        },
                        usd: {
                            estimated: null,
                            actual: null,
                        },
                    },
                    //in usd
                    takeProfitPrice: sniper.profit * buyRes.price * solPrice,
                    // takeProfitPrice: sniper.profit,
                    sellTime: null,
                    status: "pending",
                    //in usd
                    stopLossPrice: sniper.stopLoss * buyRes.price * solPrice,
                    // stopLossPrice: sniper.stopLoss,
                    tokenBuyAmount: {
                        actual: parseInt(bloxQuote.outAmount),
                        // estimated: parseInt(bloxQuote.outAmount)
                        estimated: null,
                    },
                    tokenSellAmount: {
                        actual: null,
                        estimated: null,
                    },
                    buyTxHash: buyRes.tx,
                    sellTxHash: null,
                };
                console.log(order);
                await cache.addSniperOrder(order);
                // createSniperOrderProcess(order, order.userId.toString(), order.strategyId.toString())
                // const order = {
                //   mint: token.mint,
                //   creator: token.creator,
                //   liquidityInSol: token.liquidityInSol,
                //   solAddress: token.parseInfo.pool_pc_token_account,
                //   tokenAddress: token.parseInfo.pool_coin_token_account,
                //   parseInfo: token.parseInfo,
                //   sniper: sniper,
                //   buyingPrice: tokenPriceInUsd,
                //   profit: ((sniper.profit/100) * tokenPriceInUsd) + tokenPriceInUsd,
                //   stopLoss: sniper.stopLoss * tokenPriceInUsd
                // }
                newOrders.push(order);

                //  const data = await axios.post("https://cubicus.blog:5000/sniper/createOrder", {
                //     mint: token.mint,
                //     creator: token.creator,
                //     liquidityInSol: token.liquidityInSol,
                //     solAddress: token.parseInfo.pool_pc_token_account,
                //     tokenAddress: token.parseInfo.pool_coin_token_account,
                //     parseInfo: token.parseInfo,
                //     sniper: sniper,
                //     buyingPrice: tokenPriceInUsd,
                //     profit: sniper.profit * tokenPriceInUsd,
                //     stopLoss: sniper.stopLoss * tokenPriceInUsd
                //   });
                // console.log(data.data)
            } catch (error: any) {
                console.log("error posting to server", error.message);
            }
        }),
    );
    // const newOrderIds = await postOrder(newOrders)
    // return newOrderIds
    return newOrders;
}

const postOrder = async (
    ordersToCreate: any[],
): Promise<number[] | undefined> => {
    try {
        const data = await axios.post(
            process.env.MONITOR_SERVER ??
                "https://websocket.lamboradar.com:5000/sniper/createOrder",
            {
                ordersToCreate: ordersToCreate,
            },
        );
        console.log(data.data);
        return data.data.orders;
    } catch (error: any) {
        console.log("error posting to server", error.message);
    }
};

const timeTaken = (start: number, end: number, step?: string) => {
    let timeTaken: number = end - start;
    const timeInSec = formatTimeMinSec(timeTaken / 1000);
    const info = {
        step: step,
        start: start,
        // startTime: new Date(start).getTime(),
        end: end,
        // endTime: new Date(end).getTime(),
        timeTaken: timeTaken,
        seconds: timeInSec,
    };
    console.log(info, "sniper time to analyze token");
};

const formatTimeMinSec = (timeTaken: number): string => {
    // Handle invalid inputs
    if (timeTaken < 0 || !Number.isFinite(timeTaken)) {
        throw new Error("Time value must be a positive finite number");
    }

    // Calculate minutes and seconds
    const minutes: number = Math.floor(timeTaken / 60);
    const seconds: number = Math.floor(timeTaken % 60);

    // Format the output string
    const minutesText: string = minutes === 1 ? "min" : "mins";
    const secondsText: string = seconds === 1 ? "sec" : "secs";

    // Handle special cases for cleaner output
    if (minutes === 0) {
        return `${seconds} ${secondsText}`;
    } else if (seconds === 0) {
        return `${minutes} ${minutesText}`;
    } else {
        return `${minutes} ${minutesText} ${seconds} ${secondsText}`;
    }
};

export const withRetry = async <T, Args extends any[]>(
    fn: (...args: Args) => Promise<T | null>,
    args: Args,
    maxRetries: number = 3,
    delayMs: number = 2000,
): Promise<T | null> => {
    // Helper function to create a delay
    const delay = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    // Execute with retries
    for (let retries = 0; retries <= maxRetries; retries++) {
        console.log(`Attempt ${retries + 1}...`);

        const result = await fn(...args);

        if (result !== null) {
            return result;
        }

        if (retries < maxRetries) {
            const currentDelay = delayMs * (retries + 1);
            console.log(
                `Retrying after ${currentDelay}ms... (${retries + 1}/${maxRetries})`,
            );
            await delay(currentDelay);
        }
    }

    return null;
};
