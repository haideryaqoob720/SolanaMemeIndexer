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
import { getHoldersEquity, getTokenHolders, getTop10Holders } from "./holders";
import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMint,
  getTransferFeeAmount,
  unpackAccount,
} from "@solana/spl-token";
import { getSocials } from "./getSocials";
import {
  createDefaultPumpToken,
  createDefaultToken,
  PumpTokenCreateInput,
  TokenCreateInput,
} from "../utils/defaultValues";
// import { getTokenBalance } from "@meteora-ag/dlmm";

interface metrics {
  token: TokenCreateInput;
  pumpFun: PumpTokenCreateInput;
}

// export async function getAllMetrics(
//   mint: string,
//   creator: any,
//   name?: string,
//   symbol?: string,
//   uri?: string,
//   bondingCurve?: string
// ): Promise<metrics> {
//   const mintAddress = new PublicKey(mint);
//   const ownerAddress = new PublicKey(creator);
//   //   let tokenData: Partial<TokenMetrics> = {
//   //     mint: mintAddress,
//   //   };
//   let tokenData = createDefaultToken(mint);
//   let pumpTokenData = createDefaultPumpToken(mint);
//   (tokenData.creator = creator), (tokenData.name = name);
//   tokenData.symbol = symbol;
//   tokenData.uri = uri;
//   const bondingData = await getBondingVault(mintAddress, bondingCurve);
//   if (bondingData.amount === 0) {
//     const vaults = await getVaults(mintAddress);
//     let reserve: any;
//     if (vaults) {
//       reserve = await getReserveAmount(vaults.baseVault, vaults.quoteVault);
//     }
//     pumpTokenData.reserveSol = reserve.sol ? reserve.sol : 0;
//     pumpTokenData.reserveToken = reserve.token ? reserve.token : 0;
//   } else {
//     pumpTokenData.reserveSol = bondingData.solBalance;
//     pumpTokenData.reserveToken = bondingData.amount;
//   }
//   // const topHolders = await getTop10Holders(mintAddress);
//   const mintData = await getMintInfo(mintAddress);
//   if (mintData) {
//     mintData.freezeAuthority
//       ? (tokenData.freezeable = true)
//       : (tokenData.freezeable = false);
//     mintData.mintAuthority
//       ? (tokenData.mintable = true)
//       : (tokenData.mintable = false);
//     tokenData.total_supply = mintData.uiSupply;
//     tokenData.market_cap = tokenData.total_supply * bondingData.solAmount;
//     pumpTokenData.bondingProgress = getBondingPercentage(
//       bondingData.amount,
//       tokenData.total_supply
//     );
//     tokenData.creator_equity = await getCreatorEquity(
//       mintAddress,
//       ownerAddress,
//       tokenData.total_supply
//     );
//   }
//   tokenData.socials = await getSocials(uri);
//   pumpTokenData.bondingCurve = bondingData.curve.toBase58();
//   const { totalHolders, top10Equity, creatorEquity } = await getTokenHolders(
//     mint,
//     creator
//   );
//   tokenData.total_holders = totalHolders;
//   tokenData.top_10_holder_equity = top10Equity;
//   // tokenData.creatorEquity = creatorEquity;
//   const metricsData: metrics = {
//     token: tokenData,
//     pumpFun: pumpTokenData,
//   };

//   return metricsData;
// }

export async function getAllMetrics(
  mint: string,
  creator: any,
  baseVault?:string,
  quoteVault?:string,
  name?: string,
  symbol?: string,
  uri?: string,
): Promise<Prisma.meme_token_testCreateInput> {
  const mintAddress = new PublicKey(mint);
  let ownerAddress: any = "";
  if (creator) {
    ownerAddress = new PublicKey(creator);
  }
  //   let tokenData: Partial<TokenMetrics> = {
  //     mint: mintAddress,
  //   };
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
    bondingCurve: null, //vault
    creator: creator,
    bondingProgress: 0,
    marketCap: 0,
    reserveSol: 0,
    reserveToken: 0,
    status: 0,
    buyCount: 0,
    sellCount: 0,
    totalHolders: 0,
    updated_at: new Date(),
  };
  const bondingData = await getBondingVault(mintAddress);
  if (bondingData.amount === 0) {
    let reserve: any;
    if(baseVault && quoteVault){
      console.log("vaults decoded from tx")
      reserve = await getReserveAmount(new PublicKey(baseVault), new PublicKey(quoteVault));
    }else{
      const vaults = await getVaults(mintAddress);
    if (vaults) {
      reserve = await getReserveAmount(vaults.baseVault, vaults.quoteVault);
    }
    }
    tokenData.reserveSol = reserve.sol ? reserve.sol : 0;
    tokenData.reserveToken = reserve.token ? reserve.token : 0;
  } else {
    tokenData.reserveSol = bondingData.solBalance;
    tokenData.reserveToken = bondingData.amount;
  }
  // const topHolders = await getTop10Holders(mintAddress);
  const mintData = await getMintInfo(mintAddress);
  if (mintData) {
    mintData.freezeAuthority
      ? (tokenData.freezeable = true)
      : (tokenData.freezeable = false);
    mintData.mintAuthority
      ? (tokenData.mintable = true)
      : (tokenData.mintable = false);
    tokenData.totalSupply = mintData.uiSupply;
    tokenData.marketCap = tokenData.totalSupply * bondingData.solAmount;
    tokenData.bondingProgress = getBondingPercentage(
      bondingData.amount,
      tokenData.totalSupply
    );
    if (creator) {
      let { equity, amount }: any = await getCreatorEquity(
        mintAddress,
        ownerAddress,
        tokenData.totalSupply
      );
      tokenData.creatorEquity = equity;
    }
  }

  // if (topHolders) {
  //   tokenData.top10holderEquity = await getHoldersEquity(
  //     topHolders,
  //     tokenData.totalSupply ?? 0
  //   );
  // }
  tokenData.socials = await getSocials(uri);
  tokenData.bondingCurve = bondingData.curve.toBase58();
  // tokenData.creator = await getCreator(bondingData.curve).then((pubkey) => {
  //   return pubkey?.toBase58();
  // });
  // console.log(tokenData);
  const { totalHolders, top10Equity, creatorEquity } = await getTokenHolders(
    mint,
    creator
  );
  tokenData.totalHolders = totalHolders;
  tokenData.top10holderEquity = top10Equity;
  // tokenData.creatorEquity = creatorEquity;
  return tokenData;
}

export async function getVaults(mintAddress: PublicKey) {
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
    let { baseVault, quoteVault, lpMint, lpReserve } = marketData;
    // console.log(lpMint, lpReserve, "reserve")
    console.log(marketAccount.pubkey.toBase58(), "market");
    return { baseVault, quoteVault, marketAccount, lpReserve };
  } else {
    baseVault = null;
    quoteVault = null;
    return { baseVault, quoteVault, marketAccount };
  }
}

export async function getReserveAmount(
  baseVault: PublicKey,
  quoteVault: PublicKey
) {
  // console.log(baseVault, quoteVault, "<----------------vaults");
  if (!baseVault || !quoteVault) {
    return {
      sol: 0,
      token: 0,
    };
  }
  try {
    
    const base = await config.connection.getBalance(
      baseVault,
      config.connection.commitment
    );
    const quote = await config.connection.getTokenAccountBalance(
      quoteVault,
      config.connection.commitment
    );
    let reserve: { sol: number; token: number } = {
      sol: base ?? 0/ LAMPORTS_PER_SOL,
      token: quote.value.uiAmount ?? 0,
    };
    return reserve;
  } catch (error:any) {
    console.log("error getting reserve", error.message)
    return {
      sol: 0,
      token: 0,
    };  
  }
}

export async function getMintInfo(mintAddress: PublicKey) {
  let info: any;
  try {
    info = await config.connection.getParsedAccountInfo(mintAddress);
    const decoded: any = info?.value?.data;
    const uiSupply =
      parseFloat(decoded.parsed.info.supply) /
      Math.pow(10, decoded.parsed.info.decimals);

    let { freezeAuthority, mintAuthority, decimals } = decoded.parsed.info;
    return { freezeAuthority, mintAuthority, uiSupply, decimals};
  } catch (error: any) {
    console.log("get parsed mint: ", error.message);
  }
}

// export async function getBondingCurveAccount(mint: PublicKey) {
export async function getBondingVault(
  mint: PublicKey,
  curve?: string
): Promise<{
  curve: PublicKey;
  vault: PublicKey;
  amount: number;
  solAmount: number;
  solBalance: number;
}> {
  let bondingCurve: PublicKey;
  if (curve) {
    bondingCurve = new PublicKey(curve);
  } else {
    bondingCurve = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mint.toBuffer()],
      config.pumpProgram
    )[0];
  }
  const [bondingCurveVault] = PublicKey.findProgramAddressSync(
    [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  // const bondingInfo: any = await config.connection.getParsedAccountInfo(
  //   bondingCurve
  // );
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
  let amount;
  if (tokenAmount) {
    amount = tokenAmount.value.uiAmount;
  } else {
    amount = 0;
  }
  return {
    curve: bondingCurve,
    vault: bondingCurveVault,
    amount: amount,
    solAmount: (solBalance / (tokenAmount?.value?.uiAmount ?? 0)) * 185,
    solBalance: solBalance,
  };
}

export function getBondingPercentage(
  bondingValutAmount: number,
  totalSupply?: number
): number {
  if (!totalSupply) {
    totalSupply = 1000000000;
  }
  // console.log(bondingValutAmount, reserve, "amounts");
  const leftTokens = bondingValutAmount - config.reservedTokens;
  if (!leftTokens) {
    return 100;
  }
  const initialRealTokenReserves = totalSupply - config.reservedTokens;
  const progress = 100 - (leftTokens * 100) / initialRealTokenReserves;
  if (progress > 100) {
    return 100;
  } else {
    return progress;
  }
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
    return { equity, amount };
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

export async function getTransferFeeAudit(
  mint: PublicKey
): Promise<boolean | undefined> {
  let accountInfo: any;
  try {
    accountInfo = await config.connection.getAccountInfo(mint);
    // console.log(accountInfo, "accountInfo");
    const programId = accountInfo.owner.toString();
    if (programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
      return false;
    }
    const account = unpackAccount(
      accountInfo.pubkey, // Token Account address
      accountInfo.account, // Token Account data
      TOKEN_PROGRAM_ID // Token Extension Program ID
    );
    const transferFeeAmount = getTransferFeeAmount(account);
    console.log(transferFeeAmount, "transfer fee");
    return transferFeeAmount ? true : false;
  } catch (error: any) {
    console.log("error getting transfer fee", error.message);
  }
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
