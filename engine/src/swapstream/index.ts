import { PrismaClient } from "@prisma/client";
import { config } from "../config";
import { createChildProcess } from "./createChildProcess";
import { decodeData } from "./decodeData";
import { PublicKey } from "@solana/web3.js";
import { MemeTokenTracker } from "../db/localHash";
import { RedisCache } from "../redis/store";

const prisma = new PrismaClient();

// testing function to be removed
async function get100Tokens() {
    const tokens = await prisma.meme_token_test.findMany({
        take: 10,
        orderBy: {
            id: "desc",
        },
        select: {
            mint: true,
        },
    });
    //   console.log(tokens);
    return tokens;
}

//test function to be removed later
export async function updateTokensTest() {
    const tokens = await get100Tokens();
    tokens.map((token, index) => {
        createChildProcess(token.mint, true);
    });
    // const mint = "BfFAJr3YzbBgxG7hMe22tQe2XYYNRMFFqvBe73gkpump";
    // createChildProcess(new PublicKey(mint), true);
}

export async function getSwapStream(tokenMap: RedisCache) {
    console.log("reading swap stream...");
    try {
        config.connection.onLogs(
            config.pumpProgram,
            async (logs: unknown) => {
                const data: any = [];
                // const data: any = decodeData(logs);
                // createChildProcess(data?.token.toBase58(), data?.isBuy);
                if (data !== undefined) {
                    tokenMap.updateFromPumpfun(
                        data.token.toBase58(),
                        data.isBuy,
                    );
                } else {
                    console.log("data is undefinded", data);
                }
            },
            config.connection.commitment,
        );
    } catch (error: any) {
        console.log("Error while getting swap stream: ", error.message);
    }
}
