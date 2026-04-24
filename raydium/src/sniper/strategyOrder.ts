import { createSniperOrderProcess } from "../db/addSniperOrder/handleProcess";
import getSniperStore from "../redis/sniperStore";
import { postSnipersToPumpSwap, pumpSwapCreateDecode } from "./pumpSwap";

export async function placeStrategyOrder(dex:"Raydium" | "PumpSwap", snipers:any, mint:string, decimals:number, solPrice:number, market:string, priceInSol:number){
    const cache = await getSniperStore()
    switch(dex){
        case "PumpSwap":
            const cache = await getSniperStore()
            const existingOrders = await cache.readSniperOrder(mint)
            if(existingOrders && existingOrders.length>0){
                snipers = snipers.filter((sniper:any)=>{
                    return !existingOrders.some((order) => 
                        order.userId === sniper.userId && 
                        order.strategyId === sniper.id
                    );
                })
            }
            if(snipers)
            // console.log(snipers, "snipers after order filter")
            if(snipers.length === 0){
                return
            }
            const newOrders = await postSnipersToPumpSwap(snipers, mint, decimals, solPrice, cache, market, priceInSol)
            if(newOrders){
                newOrders.map((order:any)=>{
                    createSniperOrderProcess(order, order.userId.toString(), order.strategyId.toString())
                })
            }
            break;
        case "Raydium":
            break;
        default:
            console.log("invalid dex")
            break;
    }
}