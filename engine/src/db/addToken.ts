import { Prisma, PrismaClient } from "@prisma/client";
import { publicKey } from "@raydium-io/raydium-sdk";
import { PumpTokenCreateInput, RaydiumTokenCreateInput } from "../utils/defaultValues";
import prisma from "../prisma/prisma";
import { pumpSwapCreateDecode } from "../types";
// const prisma = new PrismaClient();
// const prisma = prisma
export const addToken = async (data: Prisma.meme_token_testCreateInput) => {
  try {
    // await prisma.$connect()
    const newToken = await prisma.meme_token_test.create({
      data: data,
    });
    // console.log("added token to db");
    // await prisma.$disconnect()
    return newToken;
  } catch (error: any) {
    console.log("error adding token: ", error.message);
    // await prisma.$disconnect()
  }
};

export const getData = async () => {
  try {
    // await prisma.$connect()
    const tokenData = await prisma.meme_token_test.findMany();
    console.log(tokenData);
    return tokenData;
  } catch (error: any) {
    console.log("error getting data: ", error.message);
  }
};

export const getTokenData = async (mint: string) => {
  try {
    // await prisma.$connect()
    const tokenData = await prisma.meme_token_test.findMany({
      where: {
        mint: mint,
      },
    });
    // await prisma.$disconnect()
    console.log(tokenData, "token data");
  } catch (error: any) {
    // await prisma.$disconnect()
    console.log("error getting token data: ", error.message);
  }
};

export const createMany = async (data: any) => {
  try {
    // await prisma.$connect()
    const createdTokens = await prisma.meme_token_test.createMany({
      data: data,
    });
    // await prisma.$disconnect()
    console.log(createdTokens, "added Tokens");
  } catch (error: any) {
    // await prisma.$disconnect()
    console.log("error adding tokens to the db");
  }
};

export const createToken = async (data: Prisma.tokensCreateInput) => {
  try {
    // await prisma.$connect()
    const mint = data.mint;
    const alreadyExists = await prisma.tokens.findUnique({
      where:{
        mint
      }
    });
    if(alreadyExists){
      console.log('Mint already exists in Tokens.');
      return;
    }
    
    const newToken = await prisma.tokens.create({
      data: data,
    });
    // await prisma.$disconnect()
    return newToken;
  } catch (error: any) {
    // await prisma.$disconnect()
    console.log("error adding token: ", error.message);
  }
};

export const createPumpToken = async (
  data: PumpTokenCreateInput,
  mint: string
) => {
  // await prisma.$connect()
  try {
    const alreadyExist = await prisma.pump_tokens.findUnique({
      where: { mint: mint },
    });
    if(alreadyExist){
      console.log('Mint already exists in Pump Tokens.');
      return;
    }
    const newToken = await prisma.pump_tokens.create({
      data: {
        ...data,
        token: {
          connect: {
            mint: mint,
          },
        },
      },
    });
    // await prisma.$disconnect()
    return newToken;
  } catch (error: any) {
    // await prisma.$disconnect()
    console.log("error adding token to the pumpFun table", error.message);
  }
};


export const createRayToken = async (
  data: RaydiumTokenCreateInput,
  mint: string
) => {
  try {
    // await prisma.$connect()
    const rayToken = await prisma.raydium_tokens.create({
      data: {
        ...data,
        token: {
          connect: {
            mint: mint,
          },
        },
      },
    });
    // await prisma.$disconnect()
    console.log(rayToken);
    return rayToken;
  } catch (error: any) {
    // await prisma.$disconnect()
    console.log("error adding raydium token", error.message);
  }
};


export const createPumpSwapToken = async(token:pumpSwapCreateDecode) =>{

  try {
    // await prisma.$connect()
    const newToken = await prisma.pumpswapTokens.create({
      data: {
        mint: token.mint,
        marketAccount: token.market,
        baseVault: token.baseVault,
        quoteVault: token.quoteVault,
        isQuoteVaultSol: token.isQuoteSol,
        reserveSol: token.reserveSol,
        reserveToken: token.reserveToken,
        liquidityInSol: parseFloat(token.liquidityInSol.toString()),
        liquidityInUsd: parseFloat(token.liquidityInUsd.toString()),
        priceInSol: token.priceInSol, 
        priceInUsd: token.priceInUsd,
        lpBurn: token.lpTokenBurn,
        lpBurned: false,
      },
    });
    // await prisma.$disconnect()
    return newToken;
  } catch (error: any) {
    // await prisma.$disconnect()
    console.log("error adding token to pumpswap: ", error.message);
  }

}