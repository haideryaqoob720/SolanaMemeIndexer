import { PumpAmmSdk } from "@pump-fun/pump-swap-sdk";
import { PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { BN } from "bn.js";
import { executeTx } from "../onChain/executeTx";
import { pumpSwapCreateDecode } from "./pumpSwap";
import { Transaction } from "@solana/web3.js";

type Direction = "quoteToBase" | "baseToQuote";
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
    const outAmount = quoteAmount.toNumber()
    return { amountOut: outAmount };
  }

  console.log(amount.toString());
    const quoteAmount = await swap.swapAutocompleteQuoteFromBase(
      new PublicKey(pool),
      amount,
      0.5,
      "baseToQuote"
    );
    const outAmount = quoteAmount.toNumber()
    return { amountOut: outAmount };
}

export async function pumpSwapTx(pool:string, inAmount:number, isBuy:boolean, signer:PublicKey) {
    const amount = new BN(inAmount)
    if(isBuy){
        const buyInstruction = await swap.swapQuoteInstructions(
      new PublicKey(pool),
      amount,
      0.5,
      "quoteToBase",
      signer
    );
    return buyInstruction
    }
    const sellInstruction = await swap.swapBaseInstructions(
      new PublicKey(pool),
      amount,
      0.5,
      "baseToQuote",
      signer
    );
    return sellInstruction
}


export async function sendBuyTxPumpSwap(decoded:pumpSwapCreateDecode ,isOnChain:boolean, inAmount:number, publicKey:string, privateKey:string, price:number){
  
  const swapIx = await pumpSwapTx(decoded.market, inAmount, true, new PublicKey(publicKey))
  const blockHash = await config.connection.getLatestBlockhash()
  const newTx = new Transaction(blockHash)
  if(!swapIx){
    return {
      tx: null,
      price: price
    }
  }
  swapIx.map((ix)=>{
    newTx.add(ix)
  })
  if(!isOnChain){
        return {
          tx: null,
          price: price
        }  
  }
  // const tx = await executeTx(swapTx, privateKey)
  // return {
  //   tx: tx,
  //   price: price
  //   }
}