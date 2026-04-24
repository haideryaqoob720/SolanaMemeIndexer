import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import idl from "../../raydium_idl.json";
import { createProcess } from "../createToken/handleProcesses";
import { RedisCache } from "../redis/store";
import { getBondingProgressTest, getReservesRpc } from "../test";
import { decode } from "../raydiumDecoder/decode";
import { Liquidity, struct, u64, u8 } from "@raydium-io/raydium-sdk";
import { createDefaultTransaction } from "../utils/defaultValues";
import { TransactionFormatter } from "../utils/generalDecoder";
import { holders } from "../filters/holders";
import { tokenHolder } from "../types";
import BN from "bn.js";
// const BN = require("bn.js")
// import {BN} from "bn.js"

const bs58 = require("bs58");
const { base64 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
// const { BorshCoder, BN } = require("@coral-xyz/anchor");


export const decodeRaydium = async (data: any, tokenMap?: RedisCache) => {
  //   console.log(logs, "before decoding");
  // console.log(data?.transaction?.transaction?.transaction);
  const logs: any = data?.transaction?.transaction?.meta?.logMessages;
  if (logs?.some((log: any) => log.includes("Program log: ray_log:"))) {
    const decode = new TransactionFormatter();
    const decodedTx = decode.formTransactionFromJson(
      data?.transaction,
      new Date().getTime()
    );
    let signer: string = "";
    if (decodedTx.transaction.message.version === 0) {
      signer = decodedTx.transaction.message.staticAccountKeys[0].toBase58();
    } else {
      signer = decodedTx.transaction.message.accountKeys[0].toBase58();
    }
    // console.log(logs, "logs");
    // console.log(
    //   data?.transaction?.transaction?.meta?.preTokenBalances[0]?.mint,
    //   "log"
    // );
    let mint: string = "";
    // if (
    //   data?.transaction?.transaction?.meta?.preTokenBalances[0]?.mint ===
    //   "So11111111111111111111111111111111111111112"
    // ) {
    //   console.log(data?.transaction?.transaction?.meta, "preToken")
    //   mint = data?.transaction?.transaction?.meta?.preTokenBalances[1]?.mint;
    //   // console.log(mint);
    // }
    // function findNonSolMint(accounts) {
 mint = data?.transaction?.transaction?.meta?.preTokenBalances.find((account:any) => 
   account.mint !== 'So11111111111111111111111111111111111111112'
 )?.mint;
// }

// console.log(mint, "mint")
if(!mint){
  console.log("❗ mint not found")
}
    // 1. Extract the correct log
    const rayLog = logs.find((log: any) => log.includes("ray_log:"));
    // // 2. Extract the base64 data
    const filterBs64 = rayLog.split("ray_log:")[1].trim(); // Trim whitespace
    const len = Buffer.from(filterBs64, "base64").length;
    const swapBaseInLog = struct([
      u8("type"),
      u64("inn"),
      u64("out"),
      u64("direction"),
      u64("source"),
      u64("base"),
      u64("quote"),
      u64("delta"),
    ]);
    if (len === 57) {

      const decode = swapBaseInLog.decode(Buffer.from(filterBs64, "base64"));
      let existingMint = await tokenMap?.readToken(mint);
      if (existingMint) {
        let raydiumCache = await tokenMap?.readRayToken(mint)
      // console.log(
      //   "base vault",
      //   decode.base.toString(),
      //   "quote vault",
      //   decode.quote.toString(),
      //   "mint",
      //   mint
      //   "in am",
      //   decode.inn.toNumber(),
      //   "out am",
      //   decode.out.toNumber(),
      //   "direction",
      //   decode.direction.toNumber(),
      //   "delta",
      //   decode.delta.toNumber(),
      //   "source",
      //   decode.source.toNumber(),
      //   "sig",
      //   decodedTx.transaction.signatures[0]
      // );
    // }
const LAMPORTS_PER_SOL = new BN('1000000000');
const TOKEN_DECIMALS = new BN('1000000');

let solAmount:any = decode.direction.eq(new BN(1)) 
  ? decode.delta
  : decode.inn;

let tokenAmount:any = decode.direction.eq(new BN(1))
  ? decode.inn
  : decode.delta;

  // solAmount = solAmount.divmod(LAMPORTS_PER_SOL);
  solAmount = solAmount.divmod(LAMPORTS_PER_SOL)
  tokenAmount = tokenAmount.divmod(TOKEN_DECIMALS);
  tokenAmount = parseFloat(`${tokenAmount.div.toNumber()}.${tokenAmount.mod.toNumber()}`).toFixed(8)
  solAmount = parseFloat(`${solAmount.div.toNumber()}.${solAmount.mod.toNumber()}`).toFixed(8)

let sol:any = decode.base.divmod(LAMPORTS_PER_SOL)
let solFloat:any = parseFloat(`${sol.div.toNumber()}.${sol.mod.toNumber()}`).toFixed(8)
let token:any = decode.quote.divmod(TOKEN_DECIMALS)
let tokenFloat:any = parseFloat(`${token.div.toNumber()}.${token.mod.toNumber()}`).toFixed(8)
let liquidity:number = 0;
const solPriceFromCache = await tokenMap?.getSolPrice() ?? 0
let testPrice:number = 0;
if(solPriceFromCache){
  testPrice  = (solFloat / tokenFloat) * solPriceFromCache 
   liquidity = (tokenFloat * testPrice) + (solFloat * solPriceFromCache)
  }
  solAmount = parseFloat(solAmount.toString()).toFixed(8);
  tokenAmount = parseFloat(tokenAmount.toString()).toFixed(9);
  if(raydiumCache){
    raydiumCache.liquidity_in_sol = liquidity / solPriceFromCache
    raydiumCache.liquidity_in_usd = liquidity
    raydiumCache.price_in_sol = testPrice / solPriceFromCache
    raydiumCache.price_in_usd = testPrice
    raydiumCache.reserve_sol = parseFloat(solFloat)
    raydiumCache.reserve_token = parseFloat(tokenFloat)
    await tokenMap?.create(mint, raydiumCache, 2)
  }
const holder: tokenHolder = {
  user: signer,
  balance: tokenAmount
}
const isBuy:boolean = decode.direction.toNumber() === 1 ? false : true 
  await tokenMap?.addHolder(mint, holder, isBuy)
  const top10 =  await tokenMap?.calculateTop10(mint)
  existingMint.top_10_holder_equity = top10
  isBuy ? existingMint.buy_count++ : existingMint.sell_count++;
  existingMint.sol_volume = (parseFloat(existingMint.sol_volume) + solAmount).toString()
  existingMint.token_volume = (parseFloat(existingMint.token_volume) + tokenAmount).toString()
  existingMint.total_tx ++;
  
  
  await tokenMap?.create(mint, existingMint, 0)

try {
  let txData = createDefaultTransaction(
    mint,
    isBuy,
            signer,
            solAmount,
            tokenAmount,
            2,
            Math.floor(new Date().getTime() / 1000),
            testPrice,
            decodedTx.transaction.signatures[0]
          );
          await tokenMap?.addTx(decodedTx.transaction.signatures[0], txData);
        } catch (error: any) {
          console.log("error adding tx, decode", error.message);
        }
      } else {
        // console.log("mint not found in cache, raydium tx");
      }
    }
  } else {
    if(logs?.some((log:any)=>log.includes("Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"))){
      // console.log(logs)
    }
  }
};
