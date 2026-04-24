import { PublicKey } from "@solana/web3.js";
import { BloXRouteWrapper } from "../../bloxroute";
import { executeTx } from "../executeTx";
import { config } from "../../config";
export const sendSellTransaction = async(mint:string, publicKey:string, privateKey:string, inAmount:number, decimals:number) =>{
    const authHeader:string = process.env.AUTH_HEADER ?? ""
    const bloxRoute = new BloXRouteWrapper(authHeader)
    const inAmountRpc = await getTokenAmount(mint, publicKey)
    if(!inAmountRpc){
        return 
    }
    // const swapRes = await bloxRoute.swapApi(mint, publicKey, inAmountRpc/Math.pow(10, decimals), false)
    const swapRes = await bloxRoute.swapApi(mint, publicKey, inAmount, false)
    console.log("swapRes", swapRes)
    if(!swapRes){
        return
    }
    await executeTx(swapRes.transaction, privateKey)
    
}

export const getTokenAmount = async (mintToken: any, publicKey:string):Promise<number | null> => {
  const wallet = new PublicKey(publicKey);
  const token = new PublicKey(mintToken);
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
};