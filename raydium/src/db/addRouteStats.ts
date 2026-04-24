import { sniperRoutesStats } from "../types";
import prisma from "../prisma/prisma";

export async function addRouteStats(stats: sniperRoutesStats){
    try {
        
        const newStat = await prisma.sniperRoutesStats.create({
            data:{
                dex: stats.dex,
                route: stats.route,
                price: stats.price,
                buyRequestTime: stats.buyRequestTime ? new Date(stats.buyRequestTime) : null,
                buyResponseTime: stats.buyResponseTime ? new Date(stats.buyResponseTime) : null,
                sellRequestTime: stats.sellRequestTime ? new Date(stats.sellRequestTime) : null,
                sellResponseTime: stats.sellResponseTime ? new Date(stats.sellResponseTime) : null
            }
        })
    } catch (error:any) {
        console.log("error creating route stat", error.message)
    }
}