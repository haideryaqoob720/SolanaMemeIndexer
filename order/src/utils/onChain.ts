import { PumpAmmInternalSdk } from "@pump-fun/pump-swap-sdk";
import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { divideBN } from "./divideBN";

export async function getLatestPrice(
    pool: string,
    decimals: number,
): Promise<number | null> {
    const poolKey = new PublicKey(pool);
    const internalSdk = new PumpAmmInternalSdk(config.connection);
    try {
        const poolReserves =
            await internalSdk.getPoolBaseAndQuoteAmounts(poolKey);

        const isQuoteSol = poolReserves.fetchedPool.quoteMint.equals(
            config.solMint,
        );
        const tokenReserves = divideBN(
            isQuoteSol
                ? poolReserves.poolBaseAmount
                : poolReserves.poolQuoteAmount,
            Math.pow(10, decimals),
            decimals,
            "tokenReserve",
        );
        const solReserves = divideBN(
            isQuoteSol
                ? poolReserves.poolQuoteAmount
                : poolReserves.poolBaseAmount,
            Math.pow(10, 9),
            9,
            "solReserve",
        );
        const priceInSol: number = solReserves / tokenReserves;
        return priceInSol;
    } catch (error: any) {
        console.error("error getting latest price", error);
        return null;
    }
}
