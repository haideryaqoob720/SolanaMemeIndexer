import { PublicKey } from "@solana/web3.js"
import { getReserveAmount, getVaults } from "../filters/filters"
import { RedisCache } from "../redis/store"
import { createDefaultRaydiumToken, createDefaultSniperOrder } from "../utils/defaultValues"
import { tokenInitialMetrics } from "../filters/basic/getInitialMetrics"
import { createRayToken, createToken } from "../db/addToken"
import { getRaydiumMetrics } from "../filters/getRaydiumFilters"
import { addSniperOrderToDb, checkTokenForSniper } from "../db/addSniperOrder"
import { loggerSwap } from "../utils/swapLogger"
import { sniperStrategies } from "@prisma/client"
import { updateManySniperOrderWithToken } from "../db/updateSniperOrder"
import tokenCache  from "../redis/tokenStore"
import getRedisClient from "../redis/store"

export const migrateToken = async(mint:string, creator:string, liquidityInSol:number, solAddress:string, tokenAddress:string, parseInfo:any, orders:number[], metadata:any, quoteIsSol:boolean,
      market:string, base:string, quote:string) =>{
        // const tokenCache = tokenStore.getInstance()
  const info = {
      mint,
      creator,
      liquidityInSol,
      solAddress, 
      tokenAddress, 
      parseInfo,
      orders,
      metadata,
      quoteIsSol,
      market,
      base,
      quote
      // sniper,
      // profit,
      // loss
    }  
  console.log(info)
  // loggerSwap.info(info)
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
    const tokenMap = await getRedisClient()
    // const { token, raydium } = await checkTokenForSniper(mint)
    // const solPrice = await tokenMap.getSolPrice()
    // console.log(token, raydium)
    // if(token && raydium){
    
    // return;
    // }
    // const vaults = await getVaults(new PublicKey(mint))
    // let raydiumToken = createDefaultRaydiumToken(mint, vaults.marketAccount?.pubkey.toBase58() ?? "")
    let raydiumToken = createDefaultRaydiumToken(mint, market ?? "")
    // const reserve = await getReserveAmount(vaults.baseVault, vaults.quoteVault);
    const reserve = await getReserveAmount(new PublicKey(solAddress), new PublicKey(tokenAddress));
        console.log(reserve)
        // const lpReserve = vaults?.lpReserve?.toNumber() ?? 0
        // let lpBurn:number = 0;
        // let burnPercent:number = 0;
        // let liquidity = reserve?.sol

        // console.log("compare liquidity: ", liquidity, liquidityInSol)

    let metrics = await tokenInitialMetrics(mint, creator, metadata.name, metadata.symbol, metadata.uri);
    let dbResponse: any = await createToken(metrics);
    console.log(dbResponse, "created token")
    if(!dbResponse){
      const token = await tokenMap.readToken(mint)
      // const token = await tokenCache.readToken(mint)
    }
    
    // await tokenCache.create(mint, dbResponse, 0)
    const ray_token = await getRaydiumMetrics(mint, false);
    console.log(ray_token, "rayToken")

    ray_token.market_account = market
    ray_token.is_quote_vault_sol = quoteIsSol
    ray_token.base_vault = base
    ray_token.quote_vault = quote
    await tokenMap.create(mint, ray_token, 2);
    const dbRayTokenResponse = await createRayToken(ray_token, mint);

    // Addnig reserves into the token cache from raydium:
    const reserve_sol  = dbRayTokenResponse?.reserve_sol;
    const reserve_token = dbRayTokenResponse?.reserve_token; 
    await tokenMap.create(mint, {...dbResponse, reserve_sol, reserve_token }, 0);
    // await updateManySniperOrderWithToken(mint, orders)
    // const newOrder = createDefaultSniperOrder(mint, sniper.userId, sniper.id, price, profit/solPrice, loss/solPrice)
    // console.log(newOrder, "new order")
    // await addSniperOrderToDb(newOrder)
    // await tokenMap.addSniperOrder(newOrder)
    // const tokenFromCache = await tokenMap.readRayToken(mint)
    // console.log(tokenFromCache)

      // console.log("Token data to be saved to database...");
      // console.log(metrics);

    // await tokenMap.disconnect()
}


export const createSniperOrders = async(mint:string, sniper:sniperStrategies, price:number, profit:number, loss:number) => {
  // const tokenMap = new RedisCache()
  //   await tokenMap.connect()
    const tokenMap = await getRedisClient()
    const solPrice = await tokenMap.getSolPrice()
  const newOrder = createDefaultSniperOrder(mint, sniper.userId, sniper.id, price, profit, loss, sniper.orderAmountInSol)
    console.log(newOrder, "new order")
    const order = await addSniperOrderToDb(newOrder)
    await tokenMap.addSniperOrder(newOrder)
    return order
}