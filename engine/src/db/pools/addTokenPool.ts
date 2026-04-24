// this file is used to add pools for all dexes that the engine is running on
// the addPool file is only for meteora

import { dexPool } from "../../types";
import prisma from "../../prisma/prisma";

export const addTokenPool = async (data: dexPool) => {
    try {
        const newPool = await prisma.pools.create({
            data: {
                mint: data.mint,
                poolAddress: data.poolAddress,
                dex: data.dex,
                priceInSol: data.priceInSol,
                priceInUsd: data.priceInUsd,
                solReserves: data.solReserves,
                tokenReserves: data.tokenReserves,
                liquidityInSol: data.liquidityInSol,
                liquidityInUsd: data.liquidityInUsd,
                totalTx: data.totalTx,
                buyTx: data.buyTx,
                sellTx: data.sellTx,
            },
        });
    } catch (error: any) {
        console.log("error adding token pool", error.message, error);
    }
};
