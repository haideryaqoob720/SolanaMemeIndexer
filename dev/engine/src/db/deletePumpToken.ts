import { PrismaClient } from "@prisma/client";
import getRedisClient, { RedisCache } from "../redis/store";
import prisma from "../prisma/prisma";

// const prisma = new PrismaClient();

export async function deletePumpToken(mint:string){
    // const tokenMap = new RedisCache()
    // await tokenMap.connect()
      const tokenMap = await getRedisClient()

    try {
        const deleted = await prisma.pump_tokens.delete({
            where:{
                mint:mint
            }
        }).catch((error:any)=>{console.log("promise error deleting pump token", error.message)})
        console.log("deleted pumpToken", deleted)
    } catch (error:any) {
        console.log("error deleting pump token", error.message)
    }
}