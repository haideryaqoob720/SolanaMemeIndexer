import getPoolStore, { pool } from "../../redis/pools";
import prisma from "../../prisma/prisma";


const getReservesfromShyft = async(pool:string):Promise<any> =>{
    const myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("x-api-key", "Qqekxz2q4m80UuLz");

    const requestOptions: any = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
    };
  const res = await fetch(
    `https://defi.shyft.to/v0/pools/get_liquidity_details?address=${pool}`,
    requestOptions
  )
    .then((response) => response.text())
    .then((response) => {
      const data = JSON.parse(response);
      if (!data.result) {
        console.log("pool info not found from api");
        return;
      }
      const liquidity = data.result.liquidity;
      const sol =
        liquidity.tokenB.amount / Math.pow(10, liquidity.tokenB.decimals);
      const token =
        liquidity.tokenA.amount / Math.pow(10, liquidity.tokenA.decimals);

      return {
        dex: data.result.dex,
        sol,
        token,
        price: sol / token,
        programId: data.result.programId,
        pool: data.result.address,
      };
    })
    .catch((error:any) => console.error("shyft error: ", error.message));
    console.log(res, "shyft api res")
    return res
}

const getInitialReserves = async(pool:string):Promise<{sol:number, token:number}> =>{
    const response = await getReservesfromShyft(pool)
    console.log(response, "shyft api response")
    if(!response){
        return {sol:0, token:0}
    }
    return {sol:response.sol, token:response.token}
}


const addPoolToDb = async(pool:pool) => {
    const poolCache = await getPoolStore()
    // const reserves = await getInitialReserves(pool.poolAddress)
    let existingPool = await poolCache.getOnePool(pool.poolAddress, pool.mintAddress)
    if(existingPool){
        existingPool.solReserves = pool.solReserves
        existingPool.tokenReserves = pool.tokenReserves
        await poolCache.updatePool(existingPool.mintAddress, existingPool.poolAddress, existingPool)
    }
    try {
        const newPool = await prisma.tokenPools.upsert({
            create:{
                mint:pool.mintAddress,
                poolAddress: pool.poolAddress,
                dex:pool.dex,
                signature: pool.signature,
                priceInSol:pool.priceInSol,
                solReserves: pool.solReserves,
                tokenReserves: pool.tokenReserves
            },
            update:{
                priceInSol:pool.priceInSol,
                solReserves: pool.solReserves,
                tokenReserves: pool.tokenReserves
            },
            where:{
                poolAddress: pool.poolAddress
            }
        })
    } catch (error:any) {
        console.log("error adding new pool", error.message)
    }
}

const [pool] = process.argv.slice(2);
process.on('message', async()=>{
    const poolData:pool = JSON.parse(pool)
    await addPoolToDb(poolData)
    process.exit()
})