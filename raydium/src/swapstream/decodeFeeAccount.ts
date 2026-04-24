import { LAMPORTS_PER_SOL, VersionedTransactionResponse } from "@solana/web3.js";
import { TransactionFormatter } from "../utils/generalDecoder";
import { config } from "../config";
import { RaydiumAmmParser } from "./rayParser";


export interface migratedToken{
  mint:string;
  liquidityInSol:number;
  poolAddress:string;
  creator:string;
  blockNumber:any;
  parseInfo:any
  solVault:string;
  tokenVault:string;
  quoteIsSol:boolean;
  baseVault:string,
  quoteVault:string
}

export const decodeMigrationTx = (data:any, RAYDIUM_PARSER: RaydiumAmmParser):migratedToken | null =>{
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
    // console.log(decodedTx.meta)
    const preBal = decodedTx.meta?.preBalances[0] ?? 0
    const postBal = decodedTx.meta?.postBalances[0] ?? 0
    const fee = decodedTx.meta?.fee ?? 0
    const testLiquidity = preBal - postBal - fee
    console.log(preBal, postBal, fee)
    console.log("liquidity: ", testLiquidity / LAMPORTS_PER_SOL)
    console.log(`https://solscan.io/tx/${decodedTx.transaction.signatures[0]}`)
    const decodedRaydiumIxs = decodeRaydiumTxn(decodedTx, decode, RAYDIUM_PARSER);
        // if (POOL_IDS.length > 0) console.log(txn, POOL_IDS);
        if (!decodedRaydiumIxs?.length) return null;
        const createPoolIx = decodedRaydiumIxs.find((decodedRaydiumIx:any) => {
          if (
            decodedRaydiumIx.name === "raydiumInitialize" ||
            decodedRaydiumIx.name === "raydiumInitialize2"
          ) {
            return decodedRaydiumIx;
          }
        });
        let processedTx:migratedToken | null = null
        if (createPoolIx) {
          const info = JSON.stringify(createPoolIx.args);
          const parseInfo = JSON.parse(info);
          const solVault = parseInfo.pool_pc_token_account;
          const tokenVault = parseInfo.pool_coin_token_account;
          const solAddress =
            parseInfo.pc_mint_address === config.solMint.toBase58()
              ? parseInfo.pc_mint_address
              : parseInfo.coin_mint_address;
          const tokenAddress =
            parseInfo.coin_mint_address === config.solMint.toBase58()
              ? parseInfo.pc_mint_address
              : parseInfo.coin_mint_address;
          const lpMint = parseInfo.lp_mint_address;
          const pool = parseInfo.pool_withdraw_queue;
          const dev_wallet = parseInfo.user_wallet;
          const openTime = parseInfo.openTime;
          const startTime = new Date(openTime * 1000);
          const initialBalance = parseInfo.initPcAmount;
          const quoteIsSol:boolean = parseInfo.coin_mint_address === config.solMint.toBase58()
          console.log({
            // parseInfo,
  solVault: parseInfo.pool_pc_token_account,
  tokenVault: parseInfo.pool_coin_token_account,
  solAddress: parseInfo.pc_mint_address === config.solMint.toBase58()
    ? parseInfo.pc_mint_address
    : parseInfo.coin_mint_address,
  tokenAddress: parseInfo.coin_mint_address === config.solMint.toBase58()
    ? parseInfo.pc_mint_address
    : parseInfo.coin_mint_address,
  lpMint: parseInfo.lp_mint_address,
  pool: parseInfo.pool_withdraw_queue,
  dev_wallet: parseInfo.user_wallet,
  openTime: parseInfo.openTime,
  startTime: new Date(parseInfo.openTime * 1000),
  initialBalance: parseInfo.initPcAmount,
  quoteIsSol: quoteIsSol,
  baseVault: quoteIsSol ?  parseInfo.coin_mint_address: parseInfo.pc_mint_address,
  quoteVault: quoteIsSol ? parseInfo.pc_mint_address: parseInfo.coin_mint_address
});
          processedTx = {
            mint: tokenAddress,
            creator: dev_wallet,
            liquidityInSol: testLiquidity / LAMPORTS_PER_SOL,
            poolAddress:pool,
            blockNumber: decodedTx.slot,
            parseInfo:parseInfo,
            solVault: parseInfo.pool_pc_token_account,
            tokenVault: parseInfo.pool_coin_token_account,
            quoteIsSol: quoteIsSol,
            baseVault: quoteIsSol ? parseInfo.pc_mint_address : parseInfo.coin_mint_address,
            quoteVault: quoteIsSol ? parseInfo.coin_mint_address : parseInfo.pc_mint_address
          }
        }

        return processedTx
}


function decodeRaydiumTxn(tx: VersionedTransactionResponse, decode:TransactionFormatter, RAYDIUM_PARSER:RaydiumAmmParser) {
  if (tx.meta?.err) return;
  const allIxs = decode.flattenTransactionResponse(tx);
  const raydiumIxs = allIxs.filter((ix:any) =>
    ix.programId.equals(config.raydiumProgram)
  );
  const decodedIxs = raydiumIxs.map((ix:any) =>
    RAYDIUM_PARSER.parseInstruction(ix)
  );
  return decodedIxs;
}

function calculateSolTransfer(preBalances:any[], postBalances:any[]){
  
}