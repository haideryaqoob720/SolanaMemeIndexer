import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TokenAccountBalancePair,
} from "@solana/web3.js";
import { TokenMetrics } from "../types";
import { config } from "../config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  LIQUIDITY_STATE_LAYOUT_V4,
  publicKey,
  TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import * as borsh from "@coral-xyz/borsh";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { Prisma } from "@prisma/client";
import {
  ASSOCIATED_PROGRAM_ID,
  associatedAddress,
} from "@coral-xyz/anchor/dist/cjs/utils/token";
import { getHoldersEquity, getTop10Holders } from "./holders";
import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  getCreateObjectCache,
  getCreateObjectDB,
} from "../utils/getCreateObject";
import { MemeTokenTest } from "../redis/store";
import { getBondingProgressTest } from "../test";
// import { getTokenBalance } from "@meteora-ag/dlmm";

export function getPumpFunMetrics(
  //   mint: string,
  //   creator: string,
  //   name: string,
  //   symbol: string,
  //   uri: string,
  //   bondingCurve: string,
  existingToken: MemeTokenTest,
  solReserve: number,
  tokenReserve: number
): MemeTokenTest {
  //   const mintAddress = new PublicKey(mint);
  //   const ownerAddress = new PublicKey(creator);
  //   let tokenData: Partial<TokenMetrics> = {
  //     mint: mintAddress,
  //   };
  //   let tokenData = getCreateObjectDB(
  //     mint,
  //     creator,
  //     name,
  //     symbol,
  //     uri,
  //     bondingCurve
  //   );
  // console.log(solReserve, tokenReserve);
  // const [bondingCurveVault] = PublicKey.findProgramAddressSync(
  //   [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );
  // const tokenAmount = await config.connection.getTokenAccountBalance(
  //   bondingCurveVault
  // );
  const tokenUiAmount = tokenReserve / 1000000;
  existingToken.bondingProgress = getBondingPercentage(
    tokenUiAmount,
    //   tokenData.totalSupply
    existingToken.totalSupply ?? 0
  );
  // console.log(existingToken.bondingProgress, existingToken.mint);
  const sol = solReserve / LAMPORTS_PER_SOL;
  const token = tokenReserve / 1000000;
  existingToken.reserveSol = sol;
  existingToken.reserveToken = token;
  const price = (sol / token) * 257;
  existingToken.marketCap = existingToken.totalSupply ?? 0 * sol * 257;
  return existingToken;
}
//   const bondingData = await getBondingVault(mintAddress);
//   const topHolders = await getTop10Holders(mintAddress);
//   const mintData = await getMintInfo(mintAddress);
//   if (mintData) {
//     tokenData.totalSupply = mintData.uiSupply;
//     tokenData.marketCap = tokenData.totalSupply * solReserve;

//     // tokenData.creatorEquity = await getCreatorEquity(
//     //   mintAddress,
//     //   ownerAddress,
//     //   tokenData.totalSupply
//     // );
//   }

//   if (topHolders) {
//     tokenData.top10holderEquity = await getHoldersEquity(
//       topHolders,
//       tokenData.totalSupply ?? 0
//     );
//   }
//   tokenData.bondingCurve = bondingCurve
// tokenData.creator = await getCreator(bondingData.curve).then((pubkey) => {
//   return pubkey?.toBase58();
// });
// console.log(tokenData);

async function getVaults(mintAddress: PublicKey) {
  let marketAccount;
  [marketAccount] = await config.connection.getProgramAccounts(
    config.raydiumProgram,
    {
      filters: [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
            bytes: mintAddress.toBase58(),
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
            bytes: config.solMint.toBase58(),
          },
        },
      ],
    }
  );
  // console.log(marketAccount, "market1");
  if (!marketAccount) {
    [marketAccount] = await config.connection.getProgramAccounts(
      config.raydiumProgram,
      {
        filters: [
          { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
              bytes: config.solMint.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
              bytes: mintAddress.toBase58(),
            },
          },
        ],
      }
    );
  }
  // console.log(marketAccount, "market");
  let marketData: any;
  if (marketAccount?.account?.data) {
    marketData = LIQUIDITY_STATE_LAYOUT_V4.decode(marketAccount?.account?.data);
  }
  let baseVault, quoteVault;
  if (marketData) {
    let { baseVault, quoteVault } = marketData;
    return { baseVault, quoteVault };
  } else {
    baseVault = null;
    quoteVault = null;
    return { baseVault, quoteVault };
  }
}

async function getReserveAmount(baseVault: PublicKey, quoteVault: PublicKey) {
  // console.log(baseVault, quoteVault, "<----------------vaults");
  if (!baseVault || !quoteVault) {
    return {
      sol: 0,
      token: 0,
    };
  }

  const base = await config.connection.getTokenAccountBalance(
    baseVault,
    config.connection.commitment
  );
  const quote = await config.connection.getTokenAccountBalance(
    quoteVault,
    config.connection.commitment
  );
  let reserve: { sol: number; token: number } = {
    sol: base.value.uiAmount ?? 0,
    token: quote.value.uiAmount ?? 0,
  };
  return reserve;
}

async function getMintInfo(mintAddress: PublicKey) {
  let info: any;
  try {
    info = await config.connection.getParsedAccountInfo(mintAddress);
    const decoded: any = info?.value?.data;
    const uiSupply =
      parseFloat(decoded.parsed.info.supply) /
      Math.pow(10, decoded.parsed.info.decimals);
    let { freezeAuthority, mintAuthority } = decoded.parsed.info;
    return { freezeAuthority, mintAuthority, uiSupply };
  } catch (error: any) {
    console.log("get parsed mint: ", error.message);
  }
}

// export async function getBondingCurveAccount(mint: PublicKey) {
async function getBondingVault(mint: PublicKey): Promise<{
  curve: PublicKey;
  vault: PublicKey;
  amount: number;
  solAmount: number;
  solBalance: number;
}> {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    config.pumpProgram
  );
  // console.log(bondingCurve.toBase58(), "bonding curve");
  const [bondingCurveVault] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const bondingInfo: any = await config.connection.getParsedAccountInfo(
    bondingCurve
  );
  // console.log(bondingInfo.value.data, "bonding info");
  // console.log(bondingCurve.toBase58(), "curve");
  // console.log(bondingCurveVault.toBase58(), "vault");
  let tokenAmount: any;
  try {
    tokenAmount = await config.connection.getTokenAccountBalance(
      bondingCurveVault
    );
  } catch (error) {
    console.log("vault does not exist yet!");
    tokenAmount = 0;
  }
  const solBalance =
    (await config.connection.getBalance(bondingCurve)) / LAMPORTS_PER_SOL;
  // console.log(
  //   tokenAmount.value.uiAmount,
  //   "<--- tokens",
  //   solBalance,
  //   "<-- sol",
  //   (solBalance / (tokenAmount.value.uiAmount ?? 0)) * 185,
  //   "<-- Price"
  // );
  let amount;
  if (tokenAmount) {
    amount = tokenAmount.value.uiAmount;
  } else {
    amount = 0;
  }
  return {
    curve: bondingCurve,
    vault: bondingCurveVault,
    // amount: tokenAmount.value.uiAmount ? tokenAmount.value.uiAmount : 0,
    amount: amount,
    solAmount: (solBalance / (tokenAmount?.value?.uiAmount ?? 0)) * 185,
    solBalance: solBalance,
  };
  // console.log(bondingCurveVault.toBase58(), "bonding ata");
  // getCreator(bondingCurve);
}

function getBondingPercentage(
  bondingValutAmount: number,
  totalSupply: number
): number {
  // bondingValutAmount = bondingValutAmount / 1000000;
  // console.log(bondingValutAmount, reserve, "amounts");
  const leftTokens = bondingValutAmount - config.reservedTokens;
  if (!leftTokens) {
    return 100;
  }
  const initialRealTokenReserves = totalSupply - config.reservedTokens;
  return 100 - (leftTokens * 100) / initialRealTokenReserves;
  // return (bondingValutAmount / reserve) * 100 - 100; //bonding vault progress
}

// async function getCreator(mint: PublicKey) {}

const getCreator = async (
  bondingCurve: PublicKey
): Promise<PublicKey | undefined> => {
  let transactionList = await config.connection.getSignaturesForAddress(
    bondingCurve
  );
  // console.log(transactionList.length, "tx len");
  const reverse: any = transactionList.reverse().at(0);
  // console.log(reverse, "cx tx");
  // console.log(reverse, "creator tx");
  const firstTx = await config.connection.getParsedTransaction(
    reverse.signature,
    { maxSupportedTransactionVersion: 0 }
  );
  // console.log({ firstTx: firstTx?.transaction.message.accountKeys[0] });
  return firstTx?.transaction.message.accountKeys[0].pubkey;
};

export async function getCreatorEquity(
  token: PublicKey,
  owner: PublicKey,
  supply: number
) {
  // console.log(supply, "supply");
  const ownerAta = getAssociatedTokenAddressSync(token, owner);
  // console.log(ownerAta.toBase58(), "ata");
  try {
    const tokenAmount = await config.connection.getTokenAccountBalance(
      ownerAta
    );
    const amount: number = tokenAmount.value.uiAmount
      ? tokenAmount.value.uiAmount
      : 0;
    const equity = (amount / supply) * 100;
    return equity;
  } catch (error) {
    console.log("creator does not have tokens");
    return 0;
  }
  // console.log(
  //   tokenAmount.value.uiAmount,
  //   "<--------------------------- creator token amount "
  // );
  // return equity;
}

export async function getMetadata(metadataAccount?: PublicKey) {
  const metadata: any = await config.connection.getAccountInfo(
    new PublicKey("3oHn5KDrEiRtwT9enzBsmGnV6rbatDi27VhiG31uyCjD")
  );
  // console.log(metadata, "metadata");
  // console.log(metadata.value?.data, "data");
  // const testBuffer = Buffer.from(metadata?.value?.data);
  const testBuffer = Buffer.from("@solana/buffer-layout-utils", "base64");
  const test = testBuffer.readUInt32LE(12);
  const str = test.toString(8);
  // console.log(test, "test");
  // console.log(str, "str");
  // console.log(await decodeProgramData(testBuffer));
  // const decoder = new TextDecoder();
  // console.log(decoder.decode(testBuffer));
}

export async function decodeProgramData(buffer: any) {
  const borshAccountSchema = borsh.struct([
    borsh.str("name"),
    borsh.str("symbol"),
    borsh.str("uri"),
    borsh.publicKey("mint"),
    borsh.publicKey("bondingCurve"),
    borsh.publicKey("user"),
  ]);
  return borshAccountSchema.decode(buffer);
}
