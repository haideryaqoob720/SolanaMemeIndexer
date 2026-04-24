import prisma from "../prisma/prisma"
import { SniperStore } from "../redis/sniperStore"
const removePendingOrders = async(cache:SniperStore) =>{
    const pendingOrders = await prisma.sniperOrders.findMany({
        where: {
            status: "pending",
        },
    })
    await Promise.all(pendingOrders.map(async(order) => {
        const getMintOrders = await cache.readSniperOrder(order.mint)
        if(!getMintOrders || getMintOrders.length === 0){
            return 
        }
        await Promise.all(getMintOrders?.map(async(mintOrder) => {
            if(mintOrder.status === "pending"){
                await cache.readSniperOrder(order.mint)
            }
        }))
    }))
}