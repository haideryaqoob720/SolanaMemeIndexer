import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { BN } from "@coral-xyz/anchor";
import { PumpAmmSdk } from "@pump-fun/pump-swap-sdk";

const programId = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
const swap = new PumpAmmSdk(config.connection, programId);
export async function pumpSwapQuote(pool:string, inAmount:number, isBuy:boolean) {
    const amount = new BN(inAmount)
  if (isBuy) {
    const quoteAmount = await swap.swapAutocompleteBaseFromQuote(
      new PublicKey(pool),
      amount,
      0.5,
      "quoteToBase"
    );
    let outAmount = quoteAmount.toNumber()
    return { amountOut: outAmount };
  }
  
  console.log(amount.toString());
  const quoteAmount = await swap.swapAutocompleteQuoteFromBase(
    new PublicKey(pool),
    amount,
    0.5,
    "baseToQuote"
  );
  let outAmount = quoteAmount.toNumber()
  outAmount = outAmount/LAMPORTS_PER_SOL
    return { amountOut: outAmount };
}