import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getMintInfo } from "../filters/filters";
import { getTokenHolders } from "../filters/holders";
import { TransactionFormatter } from "../utils/generalDecoder";
import { TokenBuyAnalyzer } from "../bundleChecker/bundleCheck";
import { config } from "../config";
import { BloXRouteWrapper } from "../bloxroute";
import { sniperOrder } from "../types";
import { SniperStore } from "../redis/sniperStore";
import { pumpSwapQuote } from "./pumpSwapBuySell";
import { getSnipersFromDb } from "../db/getSnipers";
import { createSniperOrderProcess } from "../db/addSniperOrder/handleProcess";
import { testRoutesPumpSwap } from "./compareSniperMetrics";

export interface pumpSwapCreateDecode {
    mint: string;
    creator: string;
    market: string;
    quoteVault: string;
    baseVault: string;
    isQuoteSol: boolean;
    reserveSol: string;
    reserveToken: string;
    liquidityInSol: number;
    liquidityInUsd: number;
    priceInSol: number;
    priceInUsd: number;
    lpTokenBurn: string;
    decimals: number;
}

interface snipingMetrics {
    top10holderEquity: number | undefined;
    mintable: boolean | undefined;
    freezeable: boolean | undefined;
    decimals: number;
}

const bundleChecker = new TokenBuyAnalyzer(config.connection);
const bloxRoute = new BloXRouteWrapper(process.env.AUTH_HEADER ?? "");
const MIN_LP_AMOUNT: number = 78;
const MAX_TOP_HOLDERS_PERCENTAGE: number = 80;
const MAX_BUNDLE_CHECKER_PERCENTAGE = 300;

export const placeSniperOrder = async (
    decoded: pumpSwapCreateDecode,
    slot: number,
    cache: SniperStore,
) => {
    // const decode = new TransactionFormatter();
    // const decodedTx = decode.formTransactionFromJson(
    //       data?.transaction,
    //       new Date().getTime()
    //     );
    console.log(decoded, "from pump swap");
    const stepOne = Date.now();
    //get metrics
    const metrics = await getSnipingMetrics(decoded.mint, decoded.creator);
    const analyzeBuys = await bundleChecker.analyzeBuys(decoded.mint, slot);
    let initialLiquidity: number = 0;
    if (!metrics) return { shouldSnipe: false, mint: decoded.mint };
    const meetsConstantCriteria =
        decoded.liquidityInSol >= MIN_LP_AMOUNT &&
        (metrics.top10holderEquity ?? 100) <= MAX_TOP_HOLDERS_PERCENTAGE &&
        //   event.topSingleOwningPercentage <= this.MAX_INDIVIDUAL_HOLDER_PERCENTAGE &&
        !metrics.mintable &&
        !metrics.freezeable &&
        analyzeBuys.percentageOfTotalSupply <= MAX_BUNDLE_CHECKER_PERCENTAGE;

    const snipers = await getSnipersFromDb(
        decoded.liquidityInSol,
        metrics.top10holderEquity ?? 100,
        analyzeBuys.percentageOfTotalSupply,
        metrics.mintable ?? false,
        metrics.freezeable ?? false,
    );
    const solPrice = await cache.getSolPrice();
    if (snipers && snipers.length > 0) {
        console.log(`found ${snipers.length} snipers`);
        const newOrders = await postSnipersToPumpSwap(
            snipers,
            decoded.mint,
            decoded.decimals.toString(),
            solPrice,
            cache,
            decoded.market,
            decoded.priceInSol,
        );
        if (newOrders.length > 0) {
            console.log("orders created");
        }
        const stepThree = Date.now();
        //   timeTaken(stepTwo, stepThree, "2. create orders")
        if (newOrders) {
            newOrders.map((order: any) => {
                createSniperOrderProcess(
                    order,
                    order.userId.toString(),
                    order.strategyId.toString(),
                );
            });
            await Promise.all(
                snipers.map(async (sniper: any) => {
                    const amountInLamports = Math.floor(
                        (sniper.orderAmountInSol / solPrice) * LAMPORTS_PER_SOL,
                    );
                    await testRoutesPumpSwap(
                        decoded,
                        amountInLamports,
                        sniper.user.user_wallets.public_key,
                    );
                }),
            );
            // timeTaken(stepThree, stepFour, "3. migrate token")
        }
    } else {
        if (!meetsConstantCriteria) {
            console.log("Event Rejected: Does not meet snipe criteria.");
            //   if (this.debug) {
            console.log("Rejection Details:", {
                poolAmount:
                    decoded.liquidityInSol < MIN_LP_AMOUNT
                        ? `✖️ Not enough liquidity: ${decoded.liquidityInSol}`
                        : `✅ has liquidity: ${decoded.liquidityInSol}`,
                top10HoldingPercentage:
                    (metrics.top10holderEquity ?? 100) >
                    MAX_TOP_HOLDERS_PERCENTAGE
                        ? `✖️ High top holder concentration: ${metrics.top10holderEquity ?? 100}`
                        : `✅ acceptable top holder concentration: ${metrics.top10holderEquity ?? 100}`,
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
            return { shouldSnipe: false, mint: decoded.mint };
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
            return { shouldSnipe: false, mint: decoded.mint };
        }
    }
    console.log(snipers, "no snipers found for this token");
    // sniperLogger.info(`☑️ snipe ${token.mint} at ${tokenPriceInUsd} SOL`)
    return { shouldSnipe: true, mint: decoded.mint };
};

const getSnipingMetrics = async (
    mint: string,
    creator: string,
): Promise<snipingMetrics> => {
    let metrics: snipingMetrics = {
        top10holderEquity: undefined,
        mintable: undefined,
        freezeable: undefined,
        decimals: 1,
    };
    const mintInfo = await getMintInfo(new PublicKey(mint));
    const top10 = await getTokenHolders(mint, creator);
    metrics.mintable = mintInfo?.mintAuthority ? true : false;
    metrics.freezeable = mintInfo?.freezeAuthority ? true : false;
    metrics.top10holderEquity =
        top10.top10Equity > 100 ? 98 : top10.top10Equity;
    metrics.decimals = mintInfo?.decimals;
    return metrics;
};

// decoded:pumpSwapCreateDecode
export async function postSnipersToPumpSwap(
    snipers: any,
    mint: string,
    dec: string | number,
    solPrice: number,
    cache: SniperStore,
    market: string,
    priceInSol: number,
) {
    let decimals: number = 6;
    try {
        if (typeof dec === "string") {
            decimals = parseInt(dec[1]) ?? 6;
        } else {
            decimals = dec;
        }
    } catch (err: any) {
        console.log("error getting decimals");
    }
    // token.mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    // if (snipers.length === 0) {return}
    let fees = 100000;
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
            //   const bloxQuote = await blox.getQuoteApi(mint, decimals, amountInLamports, true)
            const quote = await pumpSwapQuote(market, amountInLamports, true);
            // console.log(blox, "bloxQuote")
            try {
                console.log({
                    sniperProfit: sniper.profit,
                    sniperLoss: sniper.stopLoss,
                    // price: tokenPriceInUsd,
                    orderAmount: sniper.orderAmountInSol,
                    // profitPrice: sniper.profit * tokenPriceInUsd,
                    // lossPrice: sniper.stopLoss * tokenPriceInUsd,
                    pumpSwapQuote: quote,
                });

                if (!quote) {
                    return;
                }
                if (priceInSol < 0 || priceInSol === 0) {
                    console.log(
                        "error getting latest price from, skipping token",
                        mint,
                        priceInSol,
                    );
                    return;
                }
                if (!sniper.profit || !sniper.stopLoss) {
                    return;
                }
                // const buyRes = await pumpBuyTx(mint, sniper.user.user_wallets.public_key, sniper.user.user_wallets.private_key, bloxQuote.inAmount, sniper.isOnChain ?? false)
                // if(!buyRes){return}
                // if(!buyRes || !buyRes.tx){
                //   return
                // }
                const order: sniperOrder = {
                    buyTime: Date.now(),
                    mint: mint,
                    strategyId: sniper.id,
                    userId: sniper.userId,
                    decimals: decimals,
                    dex: "PumpSwap",
                    route: "Native",
                    txFees: fees / LAMPORTS_PER_SOL,
                    keypair: {
                        public: sniper.user.user_wallets.public_key,
                        private: sniper.user.user_wallets.private_key,
                    },
                    isOnChain: sniper.isOnChain,
                    orderAmountInUsd: sniper.orderAmountInSol, //is usd name will be changed
                    buyingPrice: priceInSol * solPrice,
                    initialPrice: {
                        sol: {
                            actual: priceInSol,
                            estimated: null,
                        },
                        usd: {
                            actual: priceInSol * solPrice,
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
                    takeProfitPrice: sniper.profit * priceInSol * solPrice,
                    sellTime: null,
                    status: "pending",
                    //in usd
                    stopLossPrice: sniper.stopLoss * priceInSol * solPrice,
                    tokenBuyAmount: {
                        // actual: parseInt(quote.amountOut.toString()),
                        actual: quote.amountOut,
                        estimated: null,
                    },
                    tokenSellAmount: {
                        actual: null,
                        estimated: null,
                    },
                    //   buyTxHash:buyRes.tx,
                    buyTxHash: null,
                    sellTxHash: null,
                };
                console.log(order);
                await cache.addSniperOrder(order);
                newOrders.push(order);
            } catch (error: any) {
                console.log("error posting to server", error.message);
            }
        }),
    );
    return newOrders;
}

// const pumpBuyTx = async(mint:string, publicKey:string, privateKey:string, inAmount:number, isOnChain?:boolean):Promise<{tx:string | null, price:number} | null> =>{

// }
