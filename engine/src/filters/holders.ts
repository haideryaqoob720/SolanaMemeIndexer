import {
  PublicKey,
  TokenAccountBalancePair,
  Transaction,
} from "@solana/web3.js";
import { config } from "../config";
import { hex } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function getTop10Holders(mint: PublicKey) {
  if (mint) {
    try {
      const info = await config.connection.getTokenLargestAccounts(
        new PublicKey(mint),
        "confirmed"
      );
      return info.value.slice(1, 10);
    } catch (error: any) {
      console.log("error fetching top 10 holders: ", error.message);
      return null;
    }
  } else {
    return null;
  }
}

export async function getHoldersEquity(
  topHolders: TokenAccountBalancePair[],
  reserve: number
): Promise<number> {
  let sum: number = 0;
  topHolders.map((holder, index) => {
    holder.uiAmount ? (sum += holder.uiAmount) : (sum += 0);
  });
  const equity: number = (sum / reserve) * 100;
  return equity;
}

export const decodeBase64 = async () => {
  const test = Buffer.from(
    "vdt/007mYe4cfGL68uYxfImPIE/HBunRevIC5KrVXUf/wMmwvNV8z58WXwgAAAAAAFA5J4wEAAABARbI+yWMkrzAWz7MqWs2/XEA7wZtomf4J5XxSNs9d0n2hYZnAAAAAJ/CggQHAAAAAMCeIFfLAwCfFl8IAAAAAAAojNTFzAIA"
  );
  // const tx = Transaction.from(test);
  // console.log(tx);
  const decoder = new TextDecoder();
  const str = decoder.decode(test.slice(8, 12));
  const view = new DataView(test.buffer, 8, 12);
  const str2 = view.getUint32(0, true);
  console.log(str2.toString());
  // console.log(decoder.decode(str))
  //   const str = test.toString("utf-8");
  console.log(str);
};

export interface holders {
  address: string;
  balance: number;
}

export const getTokenHolders = async (mintAddress: string, creator: string) => {
  let topHolders: holders[] = [];
  const mint = new PublicKey(mintAddress);
  const TOKEN_ACC_SIZE = 165;
  const accs = await config.connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    dataSlice: { offset: 64, length: 8 },
    filters: [
      { dataSize: TOKEN_ACC_SIZE },
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
    ],
  });
  console.log(accs.length)
  // Filter out zero balance accounts
  const nonZero = accs.filter(
    (acc) => !acc.account.data.equals(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]))
  );
  const totalHolders = nonZero.length;
  // const firstHundred = nonZero.slice(0, 100);
  // console.log(firstHundred.length);
  let creatorEquity: number = 0;
  nonZero.map((holder, index) => {
    const accData = holder.account.data;
    const balance = Number(accData.readBigUInt64LE());
    const value = {
      address: holder.pubkey.toBase58(),
      balance: balance / 1000000,
    };
    if (value.address === creator) {
      console.log("creator found");
      creatorEquity = (value.balance / 1000000000) * 100;
    }
    topHolders.push(value);
  });
  const sortedHolders = topHolders.sort((a, b) => b.balance - a.balance);
  const top10 = sortedHolders.slice(1, 11);
  let sum: number = 0;
  top10.forEach((holder) => {
    sum += holder.balance;
  });
  const top10Equity: number = (sum / 1000000000) * 100; // total supply of pump fun is constant at 1b tokens
  return { totalHolders, top10Equity, creatorEquity };
};
