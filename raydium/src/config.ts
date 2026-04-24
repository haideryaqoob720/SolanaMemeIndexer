import { Connection, PublicKey } from "@solana/web3.js";
// import * as idlFile from "../pumpfun_idl.json";
import { Idl, Program } from "@coral-xyz/anchor";
import idl from "../raydium_idl.json";
const idlFile: any = idl;

const RPC_ENDPOINT =
"https://solana-mainnet.core.chainstack.com/871281aaa7d43baf57e912693d3a1ab6"
  // "https://solana-mainnet.core.chainstack.com/46f18fb8c176222d6731bcb9b0c1b09c";
// "https://mainnet.helius-rpc.com/?api-key=b7ec2d10-d65a-4529-99c8-8768c1974579";
const connection = new Connection(RPC_ENDPOINT, "confirmed");
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);
const solMint = new PublicKey("So11111111111111111111111111111111111111112");
const pumpfunProgramId = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);
const pumpfunAccount = new PublicKey(
  "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"
);
const bloxBaseUrl:string = 'https://ny.solana.dex.blxrbdn.com/api/v2/raydium'

// const rayProg = new Program(idlFile,)
export const config = {
  connection: connection,
  raydiumProgram: RAYDIUM_AMM_PROGRAM_ID,
  solMint: solMint,
  pumpProgram: pumpfunProgramId,
  pumpAccount: pumpfunAccount,
  reservedTokens: 206900000,
  rpcEndpoint: RPC_ENDPOINT,
  bloxBaseUrl: bloxBaseUrl,
  // idl: idlFile,
};
