import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BloXRouteWrapper } from "../../bloxroute";
import { executeTx } from "../executeTx";
import { config } from "../../config";
import { txEncode } from "@triton-one/yellowstone-grpc";
import { pumpSwapQuote } from "../../sniperSell/sellUtils";
import { pumpSwapCreateDecode } from "../../types";
import getPumpSwapStore from "../../redis/pumpswap";
export const sendSellTransaction = async(mint:string, publicKey:string, privateKey:string, inAmount:number, decimals:number, isOnChain:boolean, hasBought:boolean, dex:"Raydium" | "PumpSwap"):Promise<{tx:string | null, price:number, outAmount:number} | null> =>{
  const pumpSwapCache = await getPumpSwapStore()
    const authHeader:string = process.env.AUTH_HEADER ?? ""
    const bloxRoute = new BloXRouteWrapper(authHeader)
    const inAmountRpc = await getTokenAmount(mint, publicKey)
    if(!inAmountRpc && isOnChain){
      return null 
    }
    const AmountWithOutDecimals = (inAmountRpc ?? inAmount)/Math.pow(10, decimals)
    if(dex === "Raydium"){
      const swapRes = await bloxRoute.swapApi(mint, publicKey, privateKey, AmountWithOutDecimals, false)
      console.log("swapRes", swapRes)
      if(!swapRes){
        return null
      }
      const price = swapRes.outAmount/AmountWithOutDecimals
      if(!isOnChain || !hasBought){
        return {
          tx: null,
          price: price,
          outAmount:swapRes.outAmount
        }
      }
      const tx = await executeTx(swapRes.transaction, privateKey)
      return {
        tx: tx,
        price: price,
        outAmount:swapRes.outAmount
      }
      // return null
    }else if(dex === "PumpSwap"){
      const existingPump = await pumpSwapCache.getToken(mint)
      if(!existingPump){
        return null
      }
      console.log(mint, inAmount, decimals, isOnChain, hasBought, dex)
      const res = await pumpSwapSell(inAmountRpc ?? inAmount, mint, publicKey, privateKey, existingPump.marketAccount, isOnChain, hasBought)
      return res
    }
    return null
    
}

export const getTokenAmount = async (mintToken: any, publicKey:string):Promise<number | null> => {
  const wallet = new PublicKey(publicKey);
  const token = new PublicKey(mintToken);
  try {
    
    const tokenAccounts = await config.connection.getParsedTokenAccountsByOwner(wallet, {
      mint: token,
    });
    if (tokenAccounts.value.length === 0) {
      return null;
    }
    if (
      tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount === "0"
    ) {
      return null;
    }
    console.log({
      tokenAccounts:
      tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount,
    });
    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
  } catch (error) {
    return null;
  }
};

async function pumpSwapSell(AmountWithOutDecimals:number, mint:string, publicKey:string, privateKey:string, pool:string, isOnChain:boolean, hasBought:boolean){
      
      // const swapRes = await bloxRoute.swapApi(mint, publicKey, privateKey, AmountWithOutDecimals, false)
      const swapRes = await pumpSwapQuote(pool, AmountWithOutDecimals, false)
      console.log("swapRes", swapRes)
      if(!swapRes){
        return null
      }
      const price = (swapRes.amountOut/LAMPORTS_PER_SOL)/AmountWithOutDecimals
      if(!isOnChain || !hasBought){
        return {
          tx: null,
          price: price,
          outAmount:swapRes.amountOut
        }
      }
      return{
        tx: null,
          price: price,
          outAmount:swapRes.amountOut
      }

      // const tx = await executeTx(swapRes.transaction, privateKey)
      // return {
      //   tx: tx,
      //   price: price,
      //   outAmount:swapRes.outAmount
      // }
}