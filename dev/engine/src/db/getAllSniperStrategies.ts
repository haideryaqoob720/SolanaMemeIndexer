import { sniperStrategies } from "@prisma/client";
import prisma from "../prisma/prisma";


export async function getAllSniperStrategies():Promise<sniperStrategies[] | null>{
    try {
        const allStrategies = await prisma.sniperStrategies.findMany({
            where:{
                active:true
            },
            include:{
                user:{
                    include:{
                        user_wallets:true
                    }
                }
            }
        })
        return allStrategies
    } catch (error:any) {
        console.log("error getting all strategies from the db.", error.message)
        return null
    }
}