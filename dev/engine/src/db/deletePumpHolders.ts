import prisma from "../prisma/prisma";
import getHolderStore from "../redis/holders";
async function deleteHolderFromRedis() {
    const holdersCache = await getHolderStore();
    const tokens = await prisma.pumpswapTokens.findMany({
        where: {
            // liquidityInUsd: {
            //     lte: 10000,
            // },
            createdAt: {
                lte: new Date("2025-06-18"),
            },
        },
    });
    console.log(`need to delete ${tokens.length} mints from holders`);
    await Promise.all(
        tokens.map(async (token) => {
            await holdersCache.removeHoldersForMint(token.mint);
        }),
    );
    console.log("deleted holders main");
}

export default deleteHolderFromRedis;
