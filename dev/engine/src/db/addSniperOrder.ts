import { connect } from "pm2";
import prisma from "../prisma/prisma";
import { SniperCreateInput } from "../utils/defaultValues";
import { loggerSwap } from "../utils/swapLogger";
import { raydium_tokens, tokens } from "@prisma/client";
export const addSniperOrderToDb = async(orderInfo:SniperCreateInput) =>{
    loggerSwap.info(orderInfo)
    console.log("creating sniper order in db")
    // try {
    //     const newOrder = await prisma.sniperOrders.create({
    //         data:{
    //             // mint: orderInfo.mint,
    //             rayMint: orderInfo.mint,
    //             userId: orderInfo.userId,
    //             strategyId: orderInfo.strategyId,
    //             solAmount: orderInfo.orderAmountInSol,
    //             buyingPrice: parseFloat(orderInfo.buyingPrice.toString()),
    //             takeProfitPrice: parseFloat(orderInfo.takeProfitPrice.toString()),
    //             stopLossPrice: parseFloat(orderInfo.stopLossPrice.toString()),
    //             status: orderInfo.status
    //         }
    //     })
    //     loggerSwap.info(newOrder)
    //     console.log(newOrder)
    //     return newOrder
    // } catch (error:any) {
    //     console.log("error creating order:", error.message)
    //     loggerSwap.info(`add order to db ${error.message}`)
    // }
}



export const checkTokenForSniper = async(mint:string):Promise<{token:null | tokens, raydium: null | raydium_tokens}> =>{
    let token: tokens | null = null
    let raydium: raydium_tokens | null = null
    //check if token exist in token table
    try {
         token = await prisma.tokens.findUnique({
            where:{
                mint:mint
            }
        })
        if(!token){
            return {token:null, raydium:null}
        }
        console.log(token)
    } catch (error:any) {
        console.log("error getting token for sniper", error.message)
    }

    //check if token exist in raydium table
    try {
         raydium = await prisma.raydium_tokens.findUnique({
            where:{
                mint:mint
            }
        })
        if(!raydium){
            return {token: token, raydium:null}
        }
    } catch (error:any) {
        console.log("error getting raydium for sniper", error.message)
        
    }

    return {token:token, raydium:raydium}
}

export const updateOrders = async(mint:string) =>{
    const orders = await prisma.sniperOrders.findMany({
        where:{
            rayMint:mint
        }
    })
    // await Promise.all(orders.map(async(order)=>{
    //     await prisma.sniperOrders.update({
    //         where:{
    //             rayMint:order.mint ?? ""
    //         }
    //     })
    // }))
}


export const updateSniperOrder = async (mint:string, userId:number, strategyId:number, profit?:boolean) => {
    try {    
        const updatedOrder = await prisma.sniperOrders.updateMany({
            where:{
                rayMint:mint,
                userId:userId,
                strategyId:strategyId
            },
            data:{
                status: profit ? "profit" : "loss"   
            }
        })
        console.log(updatedOrder, "updated sniper order")
    } catch (error:any) {
        console.log("error updating order", error.message)
    }
}