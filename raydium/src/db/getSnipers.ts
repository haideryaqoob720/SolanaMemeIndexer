import { sniperStrategies } from "@prisma/client";
import prisma from "../prisma/prisma";

export const getSnipersFromDb = async(liquidity:number, top10:number, bundle:number, mintable:boolean, freezeable:boolean):Promise<sniperStrategies[] | null>=>{
    console.log(liquidity, top10, bundle, mintable, freezeable)
    try {
        const snipers = await prisma.sniperStrategies.findMany({
            where:{
            liquidityAmount:{
                lte: parseFloat(liquidity.toString())
            },
            top10HoldingPercentage:{
                gte: top10
            },
            bundlePercentage:{
                gte:bundle
            },
            mintable:mintable,
            freezeable:freezeable,
            active:true
        },
        include:{
            user:{
                include:{
                    user_wallets:true
                }
            }
        }
    })
    // console.log(snipers, "snipers from db")
    return snipers
} catch (error:any) {
    console.log("error getting snipers from db", error.message)
    return null
}
    // if(!snipers)return null

}