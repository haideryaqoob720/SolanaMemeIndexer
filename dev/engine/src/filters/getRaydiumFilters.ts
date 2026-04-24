import { PublicKey } from "@solana/web3.js"
import getRedisClient, { RedisCache } from "../redis/store"
import { createDefaultRaydiumToken, TokenCreateInput } from "../utils/defaultValues"
import { getReserveAmount, getVaults } from "./filters"
import { config } from "../config"
import  tokenCache  from "../redis/tokenStore"

export const getRaydiumMetrics = async(mint:string, isQuoteSol?:boolean, solVault?:string, tokenVault?:string, market?:string) =>{
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
  const tokenMap = await getRedisClient()

    // const tokenCache = tokenStore.getInstance()
    let existingToken:TokenCreateInput = await tokenMap.readToken(mint)
    // let existingToken:TokenCreateInput = await tokenCache.readToken(mint)
    let vaults;
    let reserve;
    let raydiumToken;
    let lpReserve:number = 0;
    if(solVault && tokenVault && market){
        raydiumToken = createDefaultRaydiumToken(mint, market)
        reserve = await getReserveAmount(new PublicKey(solVault), new PublicKey(tokenVault));
        lpReserve = await getLpReserve(true, market)
    }else{
        vaults = await getVaults(new PublicKey(mint))
        raydiumToken = createDefaultRaydiumToken(mint, vaults.marketAccount?.pubkey.toBase58() ?? "")
        reserve = await getReserveAmount(vaults.baseVault, vaults.quoteVault);
        lpReserve = await getLpReserve(false, "", vaults)
    }
    console.log(reserve)
    // const lpReserve = vaults?.lpReserve?.toNumber() ?? 0
    
    let lpBurn:number = 0;
    let burnPercent:number = 0;
    let liquidity = reserve.sol
    if(existingToken){
        if(existingToken.total_supply){
            lpBurn = lpReserve - existingToken.total_supply
            burnPercent = (lpBurn / lpReserve) * 100
            raydiumToken.lp_reserve = lpReserve
            raydiumToken.reserve_sol = isQuoteSol ? reserve.sol : reserve.token
            raydiumToken.reserve_token=  isQuoteSol ? reserve.token : reserve.sol
            raydiumToken.liquidity_in_sol = liquidity
            raydiumToken.lp_burn = lpBurn
            raydiumToken.lp_burned = lpBurn > 95 ? true : false
        }
        console.log(raydiumToken, "raydium Metrics")
    }else{

    }

    //lp Reserve


    //lp burn


    //liquidity

    // await tokenMap.disconnect()
    return raydiumToken
}

async function getLpReserve(isMarket:boolean, market?:string, vaults?:any):Promise<number>{
    if(!isMarket){
        return vaults?.lpReserve?.toNumber()
    }else{
        if(market){
            const reserve = await config.connection.getTokenAccountBalance(
                new PublicKey(market),
                config.connection.commitment
            );
            return reserve.value.uiAmount ?? 0
        }
    }
    return 0
}