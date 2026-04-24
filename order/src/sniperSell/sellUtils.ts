import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { BN } from "@coral-xyz/anchor";
import { PumpAmmSdk } from "@pump-fun/pump-swap-sdk";

const programId = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
const swap = new PumpAmmSdk(config.connection);
export async function pumpSwapQuote(
    pool: string,
    inAmount: number,
    isBuy: boolean,
    isQuoteSol: boolean,
) {
    const amount = new BN(inAmount);
    let quoteAmount: any;
    if (isBuy) {
        if (isQuoteSol) {
            quoteAmount = await swap.swapAutocompleteBaseFromQuote(
                new PublicKey(pool),
                amount,
                0.5,
                "quoteToBase",
            );
        } else {
            quoteAmount = await swap.swapAutocompleteBaseFromQuote(
                new PublicKey(pool),
                amount,
                0.5,
                "baseToQuote",
            );
        }
        console.log(quoteAmount.toNumber(), "token quote", {
            isQuoteSol: isQuoteSol,
        });
    } else {
        if (isQuoteSol) {
            quoteAmount = await swap.swapAutocompleteBaseFromQuote(
                new PublicKey(pool),
                amount,
                0.5,
                "baseToQuote",
            );
        } else {
            quoteAmount = await swap.swapAutocompleteBaseFromQuote(
                new PublicKey(pool),
                amount,
                0.5,
                "quoteToBase",
            );
            console.log(quoteAmount.toNumber(), "sol quote", {
                isQuoteSol: isQuoteSol,
            });
            let outAmount = quoteAmount.toNumber();
            outAmount = outAmount / LAMPORTS_PER_SOL;
            return { amountOut: outAmount };
        }
        let outAmount = quoteAmount.toNumber();
        return { amountOut: outAmount };

        // console.log(amount.toString());
        // quoteAmount = await swap.swapAutocompleteQuoteFromBase(
        //     new PublicKey(pool),
        //     amount,
        //     0.5,
        //     "baseToQuote",
        // );
        // outAmount = quoteAmount.toNumber();
        // outAmount = outAmount / LAMPORTS_PER_SOL;
        // return { amountOut: outAmount };
    }
}
