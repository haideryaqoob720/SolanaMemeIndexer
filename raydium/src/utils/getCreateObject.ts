import { Prisma } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";
import { MemeTokenTest } from "../redis/store";

export function getCreateObjectCache(
  mint: string,
  creator: string,
  name: string,
  symbol: string,
  uri: string,
  bondingCurve: string
): MemeTokenTest {
  let tokenData: MemeTokenTest = {
    id: 0,
    mint: mint,
    uri: uri,
    name: name,
    symbol: symbol,
    socials: [],
    top10holderEquity: undefined,
    creatorEquity: undefined,
    totalSupply: undefined,
    lpBurned: undefined,
    lpBurnedAmount: undefined,
    mintable: undefined,
    freezeable: undefined,
    tax: undefined,
    liquidityLock: undefined,
    bondingCurve: undefined, //vault
    creator: creator,
    bondingProgress: 0,
    marketCap: 0,
    reserveSol: 0,
    reserveToken: 0,
    status: 0,
    buyCount: 0,
    sellCount: 0,
    totalHolders: 0,
    updated_at: new Date().toISOString(),
  };
  return tokenData;
}

export function getCreateObjectDB(
  mint: string,
  creator: string,
  name: string,
  symbol: string,
  uri: string,
  bondingCurve: string
): Prisma.meme_token_testCreateInput {
  let tokenData: Prisma.meme_token_testCreateInput = {
    mint: mint,
    uri: uri,
    name: name,
    symbol: symbol,
    socials: [],
    top10holderEquity: null,
    creatorEquity: null,
    totalSupply: null,
    // lpBurned: null,
    // lpBurnedAmount: null,
    mintable: null,
    freezeable: null,
    tax: null,
    liquidityLock: null,
    bondingCurve: bondingCurve,
    creator: creator,
    bondingProgress: 0,
    marketCap: 0,
    reserveSol: 0,
    reserveToken: 0,
    status: 0,
    buyCount: 0,
    sellCount: 0,
    totalHolders: 0,
    updated_at: new Date().toISOString(),
  };
  return tokenData;
}

export function validateTokenObject(input: any): MemeTokenTest {
  return {
    id: input.id !== undefined ? Number(input.id) : 0,
    mint: input.mint !== undefined ? String(input.mint) : "",
    name: input.name !== undefined ? String(input.name) : "",
    uri: input.uri !== undefined ? String(input.uri) : "",
    symbol: input.symbol !== undefined ? String(input.symbol) : "",
    socials: Array.isArray(input.socials) ? input.socials.map(String) : "",
    top10holderEquity:
      input.top10holderEquity !== undefined
        ? Number(input.top10holderEquity)
        : 0,
    creatorEquity:
      input.creatorEquity !== undefined ? Number(input.creatorEquity) : 0,
    totalSupply:
      input.totalSupply !== undefined ? Number(input.totalSupply) : 0,
    lpBurned: input.lpBurned !== undefined ? Boolean(input.lpBurned) : false,
    lpBurnedAmount:
      input.lpBurnedAmount !== undefined ? Number(input.lpBurnedAmount) : 0,
    mintable: input.mintable !== undefined ? Boolean(input.mintable) : false,
    freezeable:
      input.freezeable !== undefined ? Boolean(input.freezeable) : false,
    tax: input.tax !== undefined ? Boolean(input.tax) : false,
    liquidityLock:
      input.liquidityLock !== undefined ? Boolean(input.liquidityLock) : false,
    bondingCurve:
      input.bondingCurve !== undefined ? String(input.bondingCurve) : "",
    creator: input.creator !== undefined ? String(input.creator) : "",
    bondingProgress:
      input.bondingProgress !== undefined ? Number(input.bondingProgress) : 0,
    marketCap: input.marketCap !== undefined ? Number(input.marketCap) : 0,
    reserveSol: input.reserveSol !== undefined ? Number(input.reserveSol) : 0,
    reserveToken:
      input.reserveToken !== undefined ? Number(input.reserveToken) : 0,
    status: input.status !== undefined ? Number(input.status) : 0,
    totalHolders:
      input.totalHolders !== undefined ? Number(input.totalHolders) : 0,
    buyCount: input.buyCount !== undefined ? Number(input.buyCount) : 0,
    sellCount: input.sellCount !== undefined ? Number(input.sellCount) : 0,
    updated_at:
      input.updated_at !== undefined
        ? String(input.updated_at)
        : new Date().toISOString(),
  };
}
