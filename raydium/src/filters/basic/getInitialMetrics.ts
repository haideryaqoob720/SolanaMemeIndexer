import { PublicKey } from "@solana/web3.js";
import {
  createDefaultToken,
  TokenCreateInput,
} from "../../utils/defaultValues";
import { getCreatorEquity, getMintInfo } from "../filters";
import { getTokenHolders } from "../holders";
import { getSocials } from "../getSocials";
import { Prisma } from "@prisma/client";
import { config } from "../../config";
import { checkWebsite } from "./checkWebsite";
import { rugCheck } from "./rugCheck";
import { addRugCheck } from "../../db/addRugCheck";

export async function tokenInitialMetrics(
  mint: string,
  creator: string,
  name: string,
  symbol: string,
  uri: string
): Promise<Prisma.tokensCreateInput> {
  const mintAddress = new PublicKey(mint);

  //get object with default values
  let tokenData = createDefaultToken(mint);
  //set values form logs
  tokenData.creator = creator;
  tokenData.name = name;
  tokenData.symbol = symbol;
  tokenData.uri = uri;

  //get mint info
  const mintData = await getMintInfo(mintAddress);
  if (mintData) {
    mintData.freezeAuthority
      ? (tokenData.freezeable = true)
      : (tokenData.freezeable = false);
    mintData.mintAuthority
      ? (tokenData.mintable = true)
      : (tokenData.mintable = false);
    tokenData.total_supply = mintData.uiSupply;
    // tokenData.market_cap = tokenData.total_supply * bondingData.solAmount;
  }

  //get holders equity
  const { totalHolders, top10Equity, creatorEquity } = await getTokenHolders(
    mint,
    creator
  );
  tokenData.total_holders = totalHolders;
  tokenData.top_10_holder_equity = top10Equity;

  //get socials
  tokenData.socials = await getSocials(uri);
  const signatures = await config.connection.getSignaturesForAddress(
    new PublicKey(mint)
  );
  // console.log(txCount.length, txCount, "transactions")
  // Counting buys and sells
  const counter = await countBuySellTransactions(signatures);
  tokenData.buy_count = counter?.buyCount;
  tokenData.sell_count = counter?.sellCount;
  tokenData.total_tx = signatures.length;

  //get creator equity
  if (creator && tokenData.total_supply) {
    let { equity, amount }: any = await getCreatorEquity(
      mintAddress,
      new PublicKey(creator),
      tokenData.total_supply
    );
    tokenData.creator_equity = equity;
    tokenData.creator_balance = amount;
  }

  return tokenData;
}

type TransactionSignature = {
  blockTime?: number | null;
  confirmationStatus?: string;
  signature: string;
  slot: number;
};
// Count buy and sell transactions
const countBuySellTransactions = async (signatures: TransactionSignature[]) => {
  try {
    let buyCount = 0;
    let sellCount = 0;

    // console.log("Fetched transaction signatures:", signatures.length);

    // Step 2: Fetch details for each transaction
    for (const signature of signatures) {
      const transaction = await config.connection.getTransaction(
        signature.signature,
        {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        }
      );

      // Step 3: Parse transaction logs to identify buys and sells
      if (transaction?.meta?.logMessages) {
        const logs = transaction.meta.logMessages;
        // Check if the transaction is a buy or sell
        if (logs.some((log) => log.includes("Instruction: Buy"))) {
          buyCount++;
        } else if (logs.some((log) => log.includes("Instruction: Sell"))) {
          sellCount++;
        }
      }
    }
    // console.log("BUY", buyCount);
    // console.log("sell", sellCount);

    return { buyCount, sellCount };
  } catch (error) {
    console.error("Error counting buy/sell transactions:", error);
  }
};
