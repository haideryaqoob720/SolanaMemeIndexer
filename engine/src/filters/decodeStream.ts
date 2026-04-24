// const bs58 = require("bs58");
// const { base64 } = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
// const { BorshCoder, BN } = require("@coral-xyz/anchor");

// const txInfo = Buffer.from(
//   filterBs64, // program data
//   "base64"
// );
// const base58String = bs58.default.encode(txInfo);
// console.log(base58String);
// let buffer = Buffer.from(bs58.default.decode(base58String));
// //remove first 8 bytes for the event cpi
// // buffer = buffer.slice(8);
// let coder = new BorshCoder(idl);
// let args = coder.events.decode(base64.encode(buffer));
// if (args) {
//   const tokenAmount = new BN(args.data.tokenAmount, 32) / 1000000; // 16 signifies base 16 (hexadecimal)
//   const solAmt = new BN(args.data.solAmount, 32) / LAMPORTS_PER_SOL; // 16 signifies base 16 (hexadecimal)
//   console.log("Decoded Token Amount:", tokenAmount.toString(), solAmt);
// }

// try {
//   // Listen to pump fun program logs
//   // const add = new PublicKey("39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg") // pumpfun migrator
//   // const add = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8") // raydium liq pool v4
//   const add = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"); // pump fun prog
//   this.connection.onLogs(
//     add,
//     async (logs) => {
//       7; // console.log("[PUMP.FUN] :heartpulse: Monitor heartbeat - Checking for new transactions")
//       // console.log({logs})
//       // Basic filtering for swap-related logs
//       if (logs.logs.some((log) => log.includes("Program data"))) {
//         console.log("[PUMP.FUN] :star2: swap  DETECTED :star2:");
//         const str = logs.logs.filter((log) => log.includes("Program data"));
//         console.log({ strs: str[0].split(":")[1] });
//         const filterBs64 = str[0].split(":")[1];
//         // this.processSwapLog(logs, onSwap);
//         // console.log({ logs })
//         // getTransaction(logs.signature)
//         const txInfo = Buffer.from(
//           filterBs64, // program data
//           "base64"
//         );
//         const base58String = bs58.default.encode(txInfo);
//         console.log(base58String);
//         let buffer = Buffer.from(bs58.default.decode(base58String));
//         //remove first 8 bytes for the event cpi
//         // buffer = buffer.slice(8);
//         let coder = new BorshCoder(idl);
//         let args = coder.events.decode(base64.encode(buffer));
//         if (args) {
//           const tokenAmount = new BN(args.data.tokenAmount, 32) / 1000000; // 16 signifies base 16 (hexadecimal)
//           const solAmt = new BN(args.data.solAmount, 32) / LAMPORTS_PER_SOL; // 16 signifies base 16 (hexadecimal)
//           console.log("Decoded Token Amount:", tokenAmount.toString(), solAmt);
//         }
//         console.log(args, logs);
//       }
//     },
//     "confirmed"
//   );
// } catch (error) {
//   console.error("Swap monitoring error:", error);
// }
