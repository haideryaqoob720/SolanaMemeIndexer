import { pumpswapTokens } from "@prisma/client";
import getRedisClient from "./store";
import { RedisClientType } from "redis";

export interface pool{
    poolAddress:string;
    dex:string;
    mintAddress:string
    signature:string;
    priceInSol:number;
    solReserves:number;
    tokenReserves:number;
}

interface poolData{
  pools:pool[]
  updatedAt:number
}


class tokenPoolsStore{
    private key = "token_pools"
    private client:RedisClientType;

    constructor(client:RedisClientType){
        this.client = client
    }

    async addPool(mint:string, newPool:pool){
    try {
      const existingPoolsStr = await this.client.hGet(this.key, mint.toString());
      let poolData: poolData = existingPoolsStr ? JSON.parse(existingPoolsStr) : {};
      let pools = poolData.pools ?? []

      let found:boolean = false;
      let allPools:pool[] = []
      allPools = pools.map((pool)=>{
        if(pool.poolAddress === newPool.poolAddress){
          found = true
          return newPool
        }else{
          return pool
        }
      })
      if(!found){
        allPools = [...pools, newPool]
      }
      poolData = {
        pools: allPools,
        updatedAt: Date.now()
      }
    
    // Save updated array
    await this.client.hSet(this.key, mint.toString(), JSON.stringify(poolData));
  } catch (error: any) {
    console.log(`Error adding sniper order to redis: ${error.message}`);
  }
    }
    async getAllPools(mint:string):Promise<pool[] | null>{
        try {
    const poolsString = await this.client.hGet(this.key, mint.toString());
    if (!poolsString) {
      // console.log(`No pools found for mint`);
      return null;
    }
    const poolData:poolData = JSON.parse(poolsString)
    const pools: pool[] = poolData.pools;
    return pools;
  } catch (error: any) {
    console.log(`Error getting pools for ${mint}`, error.message);
    return null;
  }
    }
    async getOnePool(poolAddress:string, mint?:string,):Promise<pool | null>{
        if(!mint){
            try {
            const poolsString = await this.client.hGetAll(this.key)
            if(!poolsString){
                return null
            }
            Object.keys(poolsString).forEach((mint) => {
                const poolData:poolData = JSON.parse(poolsString[mint]); 
                const pools: pool[] = poolData.pools;
                const pool = pools.find((pool) => pool.poolAddress === poolAddress);
                if (pool) {
                    return pool;
                }
            })
            return null
            } catch (error:any) {
             console.log(`Error getting pools for ${mint}`, error.message);   
                return null;
            }
        }  
        try {
            const poolsString = await this.client.hGet(this.key, mint.toString());
            if (!poolsString) {
                // console.log(`No pools found for mint`);
                return null;
            }
            const poolData:poolData = JSON.parse(poolsString)  
            const pools: pool[] = poolData.pools
            const pool = pools.find((pool) => pool.poolAddress === poolAddress);
            return pool || null;
        } catch (error:any) {
            console.log(`Error getting pools for ${mint}`, error.message);
            return null;
        }     
    }
    async deletePool(mint:string, poolAddress:string):Promise<boolean> {
        try {
            const poolString = await this.client.hGet(this.key, mint.toString());
            if (!poolString) {
              console.log(`No pools found for mint ${mint}`);
              return false;
            }
            let poolData:poolData = JSON.parse(poolString); 
            let pools: pool[] = poolData.pools
            const initialLength = pools.length;
            
            // Filter out the pool with matching poolAddress
            pools = pools.filter(pool => pool.poolAddress !== poolAddress);
            
            if (pools.length === 0) {
              // Remove the entire key if no pools left
              await this.client.hDel(this.key, mint.toString());
            } else if (pools.length < initialLength) {
              poolData = {
                pools:pools,
                updatedAt:poolData.updatedAt
              }
              // Update with remaining pools
              await this.client.hSet(this.key, mint.toString(), JSON.stringify(poolData));
            } else {
              // No matching pool found
              return false;
            }
            
            return true;
          } catch (error: any) {
            console.log(`Error deleting pool: ${poolAddress} for ${mint}:`, error.message);
            return false;
          }
    }
    async updatePool(mint:string, poolAddress:string, data:pool){
        await this.deletePool(mint, poolAddress)
        await this.addPool(mint, data)
    }
}

let poolCache:tokenPoolsStore | null = null;

async function getPoolStore(){
    const tokenMap = await getRedisClient()
    const client:any = tokenMap.getClient()
    if(!poolCache){
        poolCache = new tokenPoolsStore(client)
    }
    return poolCache
}

export default getPoolStore