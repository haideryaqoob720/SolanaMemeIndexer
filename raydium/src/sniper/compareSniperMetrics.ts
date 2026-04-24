import { Prisma } from "@prisma/client"
import { getSnipersFromDb } from "../db/getSnipers"
import { sniperRoutesStats } from "../types"
import { pumpSwapQuote, pumpSwapTx } from "./pumpSwapBuySell"
import { pumpSwapCreateDecode } from "./pumpSwap"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { JupiterSwap } from "./jupiterSwap"
import { config } from "../config"
import { addRouteStats } from "../db/addRouteStats"
import { BloXRouteWrapper } from "../bloxroute"

export const compareSniperMetricsWithToken = () => {
    
}

export const testRoutesPumpSwap = async(decoded: pumpSwapCreateDecode, amountInLamports:number, publicKey:string) => {
    const jup = new JupiterSwap()
    let routeStatsNative: sniperRoutesStats = {
        dex: "Pumpswap",
        route:"Native",
        price:0.0,
        buyRequestTime: Date.now(),
        buyResponseTime: null,
        sellRequestTime: null,
        sellResponseTime: null,
    }
    const quote = await pumpSwapQuote(decoded.market, amountInLamports, true)
    const nativePrice = amountInLamports/quote.amountOut
    const swap = await pumpSwapTx(decoded.market, amountInLamports, true, new PublicKey(publicKey))

    routeStatsNative.price = nativePrice;
    routeStatsNative.buyResponseTime = Date.now()

    let routeStatsJupiter:sniperRoutesStats = {
        dex:"Pumpswap",
        route:"Jupiter",
        price:0.0,
        buyRequestTime: Date.now(),
        buyResponseTime: null,
        sellRequestTime: null,
        sellResponseTime: null
    }
//    const price =  await jup.testApi({
//       inputMint:config.solMint.toBase58(),
//       outputMint:decoded.mint,
//       slippageBps:100, 
//       userPublicKey:publicKey, 
//       amount:amountInLamports.toString()
//     })
    const jupRes = await jup.testApi({
        inputMint:config.solMint.toBase58(),
        outputMint:decoded.mint,
        slippageBps:100, 
        userPublicKey:publicKey, 
        amount:amountInLamports.toString()
    },decoded.decimals)
    routeStatsJupiter.price = jupRes ?? 0
    routeStatsJupiter.buyResponseTime = Date.now()
    await addRouteStats(routeStatsNative)
    await addRouteStats(routeStatsJupiter)

}

export async function testRoutesRaydium(mint:string, decimals:number, amountInLamports:number, publicKey:string){
    const blox = new BloXRouteWrapper(process.env.AUTH_HEADER ?? "")
    const jup = new JupiterSwap()
    let routeStatsBlox: sniperRoutesStats = {
        dex: "Raydium",
        route:"BloxRoute",
        price:0.0,
        buyRequestTime: Date.now(),
        buyResponseTime: null,
        sellRequestTime: null,
        sellResponseTime: null,
    }
    const quote = await blox.getQuoteApi(mint, decimals, amountInLamports, true)
    const AmountInSol = amountInLamports/LAMPORTS_PER_SOL;
    const swapRes = await blox.swapApi(mint, publicKey, AmountInSol, true)
    const nativePrice = (amountInLamports/LAMPORTS_PER_SOL)/(swapRes?.outAmount ?? 1 )

    routeStatsBlox.price = nativePrice;
    routeStatsBlox.buyResponseTime = Date.now()

    let routeStatsJupiter:sniperRoutesStats = {
        dex:"Pumpswap",
        route:"Jupiter",
        price:0.0,
        buyRequestTime: Date.now(),
        buyResponseTime: null,
        sellRequestTime: null,
        sellResponseTime: null
    }
//    const price =  await jup.testApi({
//       inputMint:config.solMint.toBase58(),
//       outputMint:decoded.mint,
//       slippageBps:100, 
//       userPublicKey:publicKey, 
//       amount:amountInLamports.toString()
//     })
    const jupRes = await jup.testApi({
        inputMint:config.solMint.toBase58(),
        outputMint:mint,
        slippageBps:100, 
        userPublicKey:publicKey, 
        amount:amountInLamports.toString()
    },decimals)
    routeStatsJupiter.price = jupRes ?? 0
    routeStatsJupiter.buyResponseTime = Date.now()
    await addRouteStats(routeStatsBlox)
    await addRouteStats(routeStatsJupiter)

}