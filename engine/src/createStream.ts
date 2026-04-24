import { PublicKey } from "@solana/web3.js";
import { config } from "./config";
const { base64 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const { BorshCoder, BN } = require("@coral-xyz/anchor");
const bs58 = require("bs58");
import idl from "../pumpfun_idl.json";
import { getAllMetrics } from "./filters/filters";
import { addToken, createMany } from "./db/addToken";
import { RedisCache } from "./redis/store";
import { copyCache } from "./filterCache/copyCache";
// import { createLogger } from "./utils/logger";
const createLogger = require("./utils/logger");

const getTransaction = async (sig: any) => {
  const tx = await config.connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
  });
  // console.log(tx, "transaction");
  // console.log(
  //   "owner",
  //   tx?.transaction.message?.accountKeys[0].pubkey,
  //   "token",
  //   tx?.transaction.message?.accountKeys[1].pubkey
  // );
  // return tx?.transaction.message?.accountKeys;

  return {
    token: tx?.transaction.message?.accountKeys[1].pubkey,
    owner: tx?.transaction.message?.accountKeys[0].pubkey,
  };
};
let entries: number = 0;

async function decodeStream(logs: any) {
  if (
    logs.some((log: any) => log.includes("Program log: Instruction: Create"))
  ) {
    console.log("[PUMP.FUN] 🌟 NEW TOKEN DETECTED 🌟");
    const txKeys: any = await getTransaction(logs.signature);
    const str = logs.logs.filter((log: any) => log.includes("Program data"));
    try {
      let filterBs64: any;
      filterBs64 = str[0].split(":")[1];
      const txInfo = Buffer.from(
        filterBs64, // program data
        "base64"
      );
      const base58String = bs58.default.encode(txInfo);
      let buffer = Buffer.from(bs58.default.decode(base58String));
      let coder = new BorshCoder(idl);
      let args = coder.events.decode(base64.encode(buffer));
      if (args) {
        if (args.data.uri) {
          console.log(txKeys, "keys");
          if (txKeys.token && txKeys.owner) {
            const data: any = await getAllMetrics(
              txKeys.token,
              txKeys.owner.toBase58(),
              args.data.name,
              args.data.symbol,
              args.data.uri
            );
            console.log("🟢 created token in cache");
            if (data) {
              // await addToken(data);
              // await tokenMap.create(txKeys.token, data, false);
              entries++;
              if (entries >= 10) {
                copyCache(0, "meme_token_test_alpha");
                entries = 0;
                console.log("🍉 Added to db");
                // const data = await tokenMap.getAll();
                createMany(data);
              } else {
                console.log(entries, "Entries");
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log("data is undefined probably async error: ", error.message);
    }
  }
}

async function getStream() {
  let tokenMap = new RedisCache();
  tokenMap.connect();
  try {
    // Listen to pump fun program logs
    const add = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
    config.connection.onLogs(
      add,
      /* old code start */
      async (logs: any) => {
        // console.log("[PUMP.FUN] 💗 Monitor heartbeat - Checking for new transactions")
        // console.log({logs})
        // Basic filtering for swap-related logs
        if (
          logs.logs.some((log: any) =>
            log.includes("Program log: Instruction: Create")
          )
        ) {
          console.log("[PUMP.FUN] 🌟 NEW TOKEN DETECTED 🌟");
          // this.processSwapLog(logs, onSwap);
          // console.log({ logs });
          const txKeys: any = await getTransaction(logs.signature);
          // const token = txKeys[1];
          // console.log(token);

          const str = logs.logs.filter((log: any) =>
            log.includes("Program data")
          );
          // console.log({ strs: str[0].split(":")[1] });
          // console.log(str);
          // console.log({ strs: str[0].split(":")[1] });
          try {
            let filterBs64: any;
            // if(str){
            filterBs64 = str[0].split(":")[1];
            // }
            // this.processSwapLog(logs, onSwap);
            // console.log({ logs })
            // getTransaction(logs.signature)
            const txInfo = Buffer.from(
              filterBs64, // program data
              "base64"
            );
            const base58String = bs58.default.encode(txInfo);
            // console.log(base58String);
            let buffer = Buffer.from(bs58.default.decode(base58String));
            //remove first 8 bytes for the event cpi
            // buffer = buffer.slice(8);
            let coder = new BorshCoder(idl);
            let args = coder.events.decode(base64.encode(buffer));
            if (args) {
              if (args.data.uri) {
                // const tokenAmount = new BN(args.data.tokenAmount, 32) / 1000000; // 16 signifies base 16 (hexadecimal)
                // const solAmt = new BN(args.data.solAmount, 32) / LAMPORTS_PER_SOL; // 16 signifies base 16 (hexadecimal)
                // console.log(
                //   "Decoded Token Amount:",
                //   tokenAmount.toString(),
                //   solAmt
                // );
                console.log(txKeys, "keys");
                if (txKeys.token && txKeys.owner) {
                  const data: any = await getAllMetrics(
                    txKeys.token,
                    txKeys.owner.toBase58(),
                    args.data.name,
                    args.data.symbol,
                    args.data.uri
                  );
                  // console.log(args.data);
                  // console.log(args.data.name, args.data.uri, args.data.symbol);
                  console.log("🟢 created token in cache");
                  // createLogger.info("🟢 created token in cache");
                  // console.log(data, "data");
                  if (data) {
                    // await addToken(data);
                    await tokenMap.create(txKeys.token, data);
                    entries++;
                    if (entries >= 10) {
                      copyCache(0, "meme_token_test_alpha");
                      entries = 0;
                      console.log("🍉 Added to db");
                      const data = await tokenMap.getAll();
                      createMany(data);
                    } else {
                      console.log(entries, "Entries");
                    }
                  }
                }
              }

              // if (
              //   logs.logs.some((log: any) =>
              //     log.includes(
              //       "Program log: createMetadataAccountV3"
              //     )
              //   )
              // ){
              // }
              // createLoggerInstance.info("🟢 created token in cache");

              // console.log(data, "data");
            }
          } catch (error: any) {
            console.log(
              "data is undefined probably async error: ",
              error.message
            );
          }
        }
      },
      "confirmed"
    );
  } catch (error) {
    console.error("Swap monitoring error:", error);
  }
}

process.on("message", async function () {
  // console.log(token.toBase58(), isBuy);
  console.log("created process, reading create stream...");
  getStream();
  //   console.log(isUpdated, "<----child");
  //   isUpdated;
  //   process.exit();
  // ? process.send({ updateSuccessful: "update successful", isUpdated })
  // : console.log("error killing process");
});
