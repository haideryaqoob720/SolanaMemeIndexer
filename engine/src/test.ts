// // const data: Prisma.meme_token_testCreateInput = await getAllMetrics(
// //   "43Uagj4rydDk2e6Wuso42gKw7v3dqh672QsoZFRTpump",
// //   "Ag4E8R7PcSxXvEpL62LZ5rcfo4h9RkPGxPTc9amzQLBF"
// // );
// // console.log(data, "token metrics");
// // console.log(
// //   await getCreatorEquity(
// //     new PublicKey("43Uagj4rydDk2e6Wuso42gKw7v3dqh672QsoZFRTpump"),
// //     new PublicKey("Ag4E8R7PcSxXvEpL62LZ5rcfo4h9RkPGxPTc9amzQLBF"),
// //     10000000
// //   )
// // );
// // await addToken(data);
// // console.log("added token");
// // const tokenData = await getData();
// // console.log(tokenData);
// // getBondingCurveAccount(new PublicKey(mint));
// // await decodeBase64();
// // getCreateStream(tokenMap);
// // await testRedis();
// // getSwapStream(tokenMap);
// // process.on("exit", () => {
// //   process.kill(-child.pid); // Negative PID kills the group
// // });
// // await updateTokensTest();
// // await deleteRugPulled();
// // await updateBatch(20);
// // 3HHj2MghfvxQrsm2ogVYguYEW5Gnq2TEGEoBG9vQpump //test mint to check after update ***
// // await getMetadata();
// // const testBuffer = Buffer.from(
// //   "G3KpTd7rY3YKAAAARWx2aXNUcnVtcAoAAABFbHZpc1RydW1wQwAAAGh0dHBzOi8vaXBmcy5pby9pcGZzL1FtVW16eXd0UGp5Q01mVmU2bVFvcXhnbnNZRnVBSmdDQU5yRGFxZEFkQjR5aUqy92UHVcqJ2zYt9RIVVu90NApdRTkrowycNpoIPYezT+N07ueAKfotmPeaJ5dr50dMBUuL/OtYGPKthyZ81KFjaRDT+MGB287oAVwV9RGxKYaDIUQ8G8AGuuEHcK9wwxM=",
// //   "base64"
// // );
// // console.log(decodeProgramData(testBuffer));

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { config } from "./config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  initRewardInstruction,
  TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
const bs58 = require("bs58");
import idl from "../pumpfun_idl.json";
import { holders } from "./filters/holders";

// const getTransaction = async (sig: any) => {
//   const tx = await config.connection.getParsedTransaction(sig, {
//     maxSupportedTransactionVersion: 0,
//   });
//   // console.log(tx, "transaction");
//   console.log(
//     "owner",
//     tx?.transaction.message?.accountKeys[0].pubkey,
//     "token",
//     tx?.transaction.message?.accountKeys[1].pubkey
//   );
//   // return tx?.transaction.message?.accountKeys;

//   return {
//     token: tx?.transaction.message?.accountKeys[1].pubkey,
//     owner: tx?.transaction.message?.accountKeys[0].pubkey,
//   };
// };

// async function getCreateStream(createRecords: RedisCache) {
//   try {
//     // Listen to pump fun program logs
//     const add = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
//     config.connection.onLogs(
//       add,
//       /* old code start */
//       async (logs: any) => {
//         // console.log("[PUMP.FUN] 💗 Monitor heartbeat - Checking for new transactions")
//         // console.log({logs})
//         // Basic filtering for swap-related logs
//         if (
//           logs.logs.some((log: any) =>
//             log.includes("Program log: Instruction: Create")
//           )
//         ) {
//           console.log("[PUMP.FUN] 🌟 NEW TOKEN DETECTED 🌟");
//           // this.processSwapLog(logs, onSwap);
//           // console.log({ logs });
//           const txKeys: any = await getTransaction(logs.signature);
//           // const token = txKeys[1];
//           // console.log(token);

//           const str = logs.logs.filter((log: any) =>
//             log.includes("Program data")
//           );
//           // console.log({ strs: str[0].split(":")[1] });
//           // console.log(str);
//           // console.log({ strs: str[0].split(":")[1] });
//           try {
//             let filterBs64: any;
//             // if(str){
//             filterBs64 = str[0].split(":")[1];
//             // }
//             // this.processSwapLog(logs, onSwap);
//             // console.log({ logs })
//             // getTransaction(logs.signature)
//             const txInfo = Buffer.from(
//               filterBs64, // program data
//               "base64"
//             );
//             const base58String = bs58.default.encode(txInfo);
//             // console.log(base58String);
//             let buffer = Buffer.from(bs58.default.decode(base58String));
//             //remove first 8 bytes for the event cpi
//             // buffer = buffer.slice(8);
//             let coder = new BorshCoder(idl);
//             let args = coder.events.decode(base64.encode(buffer));
//             if (args) {
//               // const tokenAmount = new BN(args.data.tokenAmount, 32) / 1000000; // 16 signifies base 16 (hexadecimal)
//               // const solAmt = new BN(args.data.solAmount, 32) / LAMPORTS_PER_SOL; // 16 signifies base 16 (hexadecimal)
//               // console.log(
//               //   "Decoded Token Amount:",
//               //   tokenAmount.toString(),
//               //   solAmt
//               // );
//               // console.log(args.data);
//               console.log(args.data.name, args.data.uri, args.data.symbol);
//             }

//             if (txKeys.token && txKeys.owner) {
//               const data: any = await getAllMetrics(
//                 txKeys.token,
//                 txKeys.owner.toBase58(),
//                 args.data.name,
//                 args.data.symbol,
//                 args.data.uri
//               );
//               // await addToken(data);
//               createRecords.create(txKeys.token.toBase58(), data);
//               console.log("🟢 created token in cache");
//               // if (
//               //   logs.logs.some((log: any) =>
//               //     log.includes(
//               //       "Program log: createMetadataAccountV3"
//               //     )
//               //   )
//               // ){
//               // }
//               // console.log(data, "data");
//               // createRecords.handleCreateLog(txKeys.token,
//               //   txKeys.owner.toBase58(),
//               //   args.data.name,
//               //   args.data.symbol,
//               //   args.data.uri)
//             }
//           } catch (error: any) {
//             console.log(
//               "data is undefined probably async error: ",
//               error.message
//             );
//           }
//         }
//       },
//       "confirmed"
//     );


export const getMeteoraSolPool = async(pool:string)=>{
const market = new PublicKey(pool)
  const pool1Address = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_one"),
      market.toBuffer()
    ],
    new PublicKey(config.dexPrograms.METEORA)
)[0];
console.log(pool1Address.toBase58())
}




export function getBondingProgressTest(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  realSolReserves: number,
  realTokenReserves: BN
): {
  priceUsd: number;
  progress: BN;
  marketCap: number;
  solReserve: number;
  tokenReserve: number;
} {
  const vSol = virtualSolReserves / LAMPORTS_PER_SOL;
  const vToken = virtualTokenReserves / 1000000;
  const price = (vSol / vToken) * 246.38;
  const reservedTokens = new BN(206900000).mul(new BN(1000_000));
  const initialRealTokenReserves = new BN(1000_000_000_000_000).sub(
    reservedTokens
  );
  const bondingCurveProgress = new BN(100).sub(
    realTokenReserves.mul(new BN(100)).div(initialRealTokenReserves)
  );
  return {
    priceUsd: price,
    progress: bondingCurveProgress.toNumber(),
    marketCap: new BN(price).mul(new BN(1000_000_000_000_000)),
    solReserve: realSolReserves / LAMPORTS_PER_SOL,
    tokenReserve: realTokenReserves.div(new BN(1000_000)).toNumber(),
  };
}

//  const initialRealTokenReserves = data.tokenTotalSupply.sub(reservedTokens);
//  const bondingCurveProgress = new BN(100).sub(
//    data.realTokenReserves.mul(new BN(100)).div(initialRealTokenReserves)
//  );

function getBondingPercentage(
  bondingValutAmount: number,
  totalSupply: number
): number {
  // console.log(bondingValutAmount, reserve, "amounts");
  const leftTokens = bondingValutAmount - config.reservedTokens;
  if (!leftTokens) {
    return 100;
  }
  const initialRealTokenReserves = totalSupply - config.reservedTokens;
  return 100 - (leftTokens * 100) / initialRealTokenReserves;
  // return (bondingValutAmount / reserve) * 100 - 100; //bonding vault progress
}

export async function getReservesRpc(mint: PublicKey) {
  const userPrivateKey =
    "41mjWEU6cYqiCyYvnSbMh7TnZSZmnzfoFagHyioZvUCyxYyq2hfvPbgQvguwmpDEXmW4VjkcNykWhu8yXqrcJY6t";
  const pumpSwapPID = new PublicKey(
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
  );
  const userWallet = new Wallet(
    Keypair.fromSecretKey(bs58.default.decode(userPrivateKey))
  );
  console.log(userWallet);
  const provider = new AnchorProvider(config.connection, userWallet, {
    commitment: "processed",
  });
  const idlFile: any = idl;
  const program: any = new Program(idlFile, provider);
  // console.log(program);
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), new PublicKey(mint).toBytes()],
    pumpSwapPID
  );
  //    const bondingCurve = new PublicKey("DnCYKMLtQp9J5jCNMXTk51hyi8WAk27HrdyK2s7JvijC")
  // console.log({ bondingCurve });
  const data = await program.account.bondingCurve.fetch(bondingCurve);
  //We multiply by 1000_000 as coin have value in 6 decimals
  const reservedTokens = new BN(206900000).mul(new BN(1000_000));
  const initialRealTokenReserves = data.tokenTotalSupply.sub(reservedTokens);
  const bondingCurveProgress = new BN(100).sub(
    data.realTokenReserves.mul(new BN(100)).div(initialRealTokenReserves)
  );
  console.log({
    bondingCurveProgress: bondingCurveProgress.toString(10),
    rpcDATA_Real: data.realTokenReserves.toNumber(),
    rpcDATA_virtual: data.virtualTokenReserves.toNumber(),
    rpcDATA_total_supply: data.tokenTotalSupply.toNumber(),
  });
  // return bondingCurveProgress.toString(10);
}

export const getTokenHolders = async (
  mintAddress: string,
  mint2: string,
  creator: string
) => {
  let topHolders: holders[] = [];
  const mint = new PublicKey(mintAddress);
  const mintt = new PublicKey(mint2);
  const TOKEN_ACC_SIZE = 165;
  const accs = await config.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    dataSlice: { offset: 64, length: 8 },
    filters: [
      { dataSize: TOKEN_ACC_SIZE },
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
      { memcmp: { offset: 1, bytes: mintt.toBase58() } },
    ],
  });
  console.log(accs);
  // Filter out zero balance accounts
  // const nonZero = accs.filter(
  //   (acc) => !acc.account.data.equals(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]))
  // );
  // const totalHolders = nonZero.length;
  // // const firstHundred = nonZero.slice(0, 100);
  // // console.log(firstHundred.length);
  // let creatorEquity: number = 0;
  // nonZero.map((holder, index) => {
  //   const accData = holder.account.data;
  //   const balance = Number(accData.readBigUInt64LE());
  //   const value = {
  //     address: holder.pubkey.toBase58(),
  //     balance: balance / 1000000,
  //   };
  //   if (value.address === creator) {
  //     console.log("creator found");
  //     creatorEquity = (value.balance / 1000000000) * 100;
  //   }
  //   topHolders.push(value);
  // });
  // const sortedHolders = topHolders.sort((a, b) => b.balance - a.balance);
  // const top10 = sortedHolders.slice(1, 11);
  // let sum: number = 0;
  // top10.forEach((holder) => {
  //   sum += holder.balance;
  // });
  // const top10Equity: number = (sum / 1000000000) * 100; // total supply of pump fun is constant at 1b tokens
  // return { totalHolders, top10Equity, creatorEquity };
};
