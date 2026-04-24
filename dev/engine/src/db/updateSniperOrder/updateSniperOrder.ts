import { sniperOrderTest } from "../../redis/types";
import prisma from "../../prisma/prisma";
import { sniperOrders } from "@prisma/client";

export async function updateSniperOrder(order: sniperOrderTest): Promise<sniperOrders | null> {
  try {
    // Find the existing order by mint, userId, and strategyId
    const existingOrder = await prisma.sniperOrders.findFirst({
      where: {
        mint: order.mint,
        userId: order.userId,
        strategyId: order.strategyId,
      },
    //   include: {
    //     initialPrice: true,
    //     finalPrice: true,
    //     tokenBuyAmount: true,
    //     tokenSellAmount: true,
    //   },
    });

    if (!existingOrder) {
      console.error("Order not found for update");
      return null;
    }

    // Update the order with new values
    const updatedOrder = await prisma.sniperOrders.update({
      where: {
        id: existingOrder.id, // Using the id from the found record
      },
      data: {
        status: order.status,
        initialPrice: {
          // update: {
            sol: {
              estimated: order.initialPrice.sol?.estimated || null,
              actual: order.initialPrice.sol?.actual || null,
            },
            usd: {
              estimated: order.initialPrice.usd?.estimated || null,
              actual: order.initialPrice.usd?.actual || null,
            },
          // },
        },
        finalPrice: {
          // update: {
            sol: {
              estimated: order.finalPrice.sol?.estimated || null,
              actual: order.finalPrice.sol?.actual || null,
            },
            usd: {
              estimated: order.finalPrice.usd?.estimated || null,
              actual: order.finalPrice.usd?.actual || null,
            },
          // },
        },
        sellAmount:{
                            sol:{
                              estimated:order.sellAmount.sol?.estimated || null,
                              actual:order.sellAmount.sol?.actual || null,
                            },
                            usd:{
                              estimated: order.sellAmount.usd?.estimated || null,
                              actual: order.sellAmount.usd?.actual || null,
                            }
                          },
        tokenBuyAmount: {
          // update: {
            estimated: order.tokenBuyAmount?.estimated || null,
            actual: order.tokenBuyAmount?.actual || null,
          // },
        },
        tokenSellAmount: {
          // update: {
            estimated: order.tokenSellAmount?.estimated || null,
            actual: order.tokenSellAmount?.actual || null,
          // },
        },
        
        // buyTime: order.buyTime,
        sellTime: order.sellTime ? new Date(order.sellTime).toISOString() : null,
        // buyTxHash: order.buyTxHash,
        sellTxHash: order.sellTxHash,
        updatedAt: new Date(), // Update the timestamp
      },
    });

    return updatedOrder;
  } catch (error) {
    console.error("Error updating sniper order", error);
    return null;
  }
}