import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import idl from "../../pumpfun_idl.json";
import { createProcess } from "../createToken/handleProcesses";
import { RedisCache } from "../redis/store";
import { getBondingProgressTest, getReservesRpc } from "../test";
import { createDefaultTransaction } from "../utils/defaultValues";
import { TransactionFormatter } from "../utils/generalDecoder";
import { realTimeTokenMetrics } from "../types";
import GeneralParser from "../gRpc/generalDecoder";
import { VersionedTransactionResponse } from "@solana/web3.js";
import extractPumpFunEvents from "../pumpFun/instructions/extractEvents";
import processPumpFunEvents from "../pumpFun/instructions/processEvents";

const bs58 = require("bs58");
const { base64 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const { BorshCoder, BN } = require("@coral-xyz/anchor");
export const decodeData = async (
    tx: VersionedTransactionResponse,
    generalParser: GeneralParser,
    tokenMap: RedisCache,
) => {
    // console.log("Decode data here: ");
    // console.log(data);
    // const logs = data?.transaction?.transaction?.meta?.logMessages;
    // if (logs?.some((log: any) => log.includes("Program data"))) {
    //   const decode = new TransactionFormatter();
    //   const decodedTx = decode.formTransactionFromJson(
    //     data?.transaction,
    //     new Date().getTime()
    //   );
    //   // console.log("[PUMP.FUN] 🌟 SWAP  DETECTED 🌟");
    //   const str = logs.filter((log: any) => log.includes("Program data"));
    //   const filterBs64 = str[0].split(":")[1];
    //   const txInfo = Buffer.from(
    //     filterBs64, // program data
    //     "base64"
    //   );
    //   const base58String = bs58.default.encode(txInfo);
    //   let buffer = Buffer.from(bs58.default.decode(base58String));
    //   let coder = new BorshCoder(idl);
    //   let args = coder.events.decode(base64.encode(buffer));
    //   // console.log("Data before passed to events...");
    //   // console.log(args);
    //   // if (args?.name === "CompleteEvent") {
    //   //   console.log(
    //   //     new Date(args.data.timestamp.toNumber() * 1000).toISOString(),
    //   //     args.data.timestamp.toNumber(),
    //   //     args
    //   //   );
    //   // }
    //   if (args?.name === "CreateEvent") {
    //     if (args?.data) {
    //       if (
    //         args.data?.name &&
    //         args.data?.symbol &&
    //         args.data?.uri &&
    //         args.data?.mint &&
    //         args.data?.bondingCurve &&
    //         args.data?.user
    //       ) {
    //         createProcess(
    //           args.data.mint.toBase58(),
    //           args.data.user.toBase58(),
    //           args.data.name,
    //           args.data.symbol,
    //           args.data.uri,
    //           args.data.bondingCurve.toBase58()
    //         ); // creates a process to fetch and calculate metrics adds the token to the cache and the db without awaiting the stream
    //       }
    //     }
    //   } else if (args?.name === "TradeEvent") {
    //     if (args?.data) {
    //       if (
    //         args.data?.mint &&
    //         args.data?.realSolReserves &&
    //         args.data?.realTokenReserves
    //       ) {
    //         await tokenMap?.updateFromPumpfun(
    //           args.data.mint.toBase58(),
    //           args.data.isBuy,
    //           decodedTx.transaction.signatures[0],
    //           args.data.virtualSolReserves,
    //           args.data.virtualTokenReserves,
    //           args.data.realSolReserves,
    //           args.data.realTokenReserves,
    //           args
    //         );
    //       }
    //     }
    //   } else if (args?.name === "CompleteEvent") {
    //     console.log(args);
    //     if (args.data.mint && args.data.timestamp) {
    //       await tokenMap?.bondingCompleted(
    //         args.data.mint.toBase58(),
    //         args.data.timestamp.toNumber()
    //       );
    //     }
    //   }
    // }
    const pumpFunIx = generalParser.getAllPumpfunIxFromTx(tx);
    if (!pumpFunIx) return;
    // console.log(pumpFunIx);
    const instructions = extractPumpFunEvents(
        pumpFunIx,
        tx.transaction.signatures[0],
    );
    // console.log(instructions);
    await Promise.all([
        instructions.forEach(async (ix: any) => {
            if (!ix) return;
            await processPumpFunEvents(ix.name, ix, tx, tokenMap);
        }),
    ]);
};
