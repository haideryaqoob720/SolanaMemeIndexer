import { PublicKey } from "@solana/web3.js"
import getRedisClient, { RedisCache } from "../redis/store"
import { createDefaultRaydiumToken, TokenCreateInput } from "../utils/defaultValues"
import { getReserveAmount, getVaults } from "./filters"

export const getRaydiumMetrics = async(mint:string) =>{
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
    const tokenMap = await getRedisClient()
    let existingToken:TokenCreateInput = await tokenMap.readToken(mint)
    const vaults = await getVaults(new PublicKey(mint))
    let raydiumToken = createDefaultRaydiumToken(mint, vaults.marketAccount?.pubkey.toBase58() ?? "")
    const reserve = await getReserveAmount(vaults.baseVault, vaults.quoteVault);
    console.log(reserve)
    const lpReserve = vaults.lpReserve.toNumber() ?? 0
    let lpBurn:number = 0;
    let burnPercent:number = 0;
    let liquidity = reserve.sol
    if(existingToken){
        if(existingToken.total_supply){
            lpBurn = lpReserve - existingToken.total_supply
            burnPercent = (lpBurn / lpReserve) * 100
            raydiumToken.lp_reserve = lpReserve
            raydiumToken.reserve_sol = reserve.sol
            raydiumToken.reserve_token= reserve.token
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

    await tokenMap.disconnect()
    return raydiumToken
}