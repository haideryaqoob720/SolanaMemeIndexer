import prisma from "../prisma/prisma";

export const updateManySniperOrderWithToken = async(mint:string, orders:number[]) => {
    await Promise.all(orders.map(async(order)=>{await updateSniperOrderWithToken(mint, order)}))
}

const updateSniperOrderWithToken = async(mint:string, order:number) => {
    console.log(order, "order id")
    try {
        const updatedOrder = await prisma.sniperOrders.update({
            where:{
                id: order
            },
            data: {
                mint: mint,
                // token: {
                    //   connect: {
                        //     mint: mint
                        //   }
                        // }
                    }
                })
                console.log(updatedOrder, "updated Order")
            } catch (error:any) {
                console.log(`error updating order ${order}`, error.message)
            }
}