import { Connection, PublicKey } from "@solana/web3.js";
import aggregators from "./aggregators.json";
import { RateLimiter } from "limiter";

export class TokenBuyAnalyzer {
  private connection: Connection;
  private aggregators: Set<string>;
  private limiter: RateLimiter;

  constructor(connection: Connection) {
    this.connection = connection;
    this.aggregators = new Set(aggregators);
    this.limiter = new RateLimiter({ tokensPerInterval: 10, interval: "second" });
  }

  private async fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await this.limiter.removeTokens(1);
    return await fn();
  }

  private isValidPublicKey(value: string): boolean {
    try {
      new PublicKey(value);
      return true;
    } catch (err) {
      return false;
    }
  }

  private containsMintAndAggregator(transaction: any, mintBase58: string, mintBuffer: Buffer): boolean {
    let containsMint = false;
    let containsAggregator = false;

    const search = (obj: any): void => {
      if (typeof obj === "string") {
        if (obj === mintBase58) {
          containsMint = true;
        }
        if (this.aggregators.has(obj)) {
          containsAggregator = true;
        }
      } else if (Buffer.isBuffer(obj)) {
        if (obj.equals(mintBuffer)) {
          containsMint = true;
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(search);
      } else if (obj && typeof obj === "object") {
        Object.values(obj).forEach(search);
      }
    };

    search(transaction);

    return containsMint && containsAggregator;
  }

  private async fetchTransactionsInRange(tokenMint: string, blockNumber: number): Promise<any[]> {
    const blockRange = 5; 
    const mintPublicKey = new PublicKey(tokenMint);
    const mintBase58 = mintPublicKey.toBase58();
    const mintBuffer = mintPublicKey.toBuffer();

    const blockNumbers = Array.from({ length: blockRange * 2 + 1 }, (_, i) => blockNumber - blockRange + i);

    const fetchBlock = async (i: number): Promise<any[]> => {
      return this.fetchWithRateLimit(async () => {
        try {
          const block = await this.connection.getBlock(i, {
            maxSupportedTransactionVersion: 0,
            transactionDetails: "full",
          });

          if (!block || !block.transactions || block.transactions.length === 0) {
            return [];
          }

          const matchingTransactions = block.transactions.filter((tx) => {
            try {
              return this.containsMintAndAggregator(tx, mintBase58, mintBuffer);
            } catch (err) {
              return false;
            }
          });

          return matchingTransactions;
        } catch (err) {
          console.error(`Error fetching block ${i}:`, err);
          return [];
        }
      });
    };

    const results = await Promise.all(blockNumbers.map(fetchBlock));
    return results.flat();
  }

  private async extractBuyAmounts(
    transactions: any[],
    tokenMint: string,
    txidToSkip?: string
  ): Promise<number[]> {
    const buyAmounts: number[] = [];

    for (const tx of transactions) {
      try {
        if (!tx || !tx.transaction || !tx.meta) {
          continue;
        }

        const txid = tx.transaction.signatures[0];
        if (txidToSkip && txid === txidToSkip) {
          continue;
        }

        const meta = tx.meta;
        const transaction = tx.transaction;

        let accountKeys: string[] = [];
        if (transaction.version === "legacy") {
          if (!transaction.message || !transaction.message.accountKeys) {
            continue;
          }
          accountKeys = transaction.message.accountKeys.map((key: any) => key.toString());
        } else {
          if (!transaction.message || !transaction.message.staticAccountKeys) {
            continue;
          }
          accountKeys = transaction.message.staticAccountKeys.map((key: any) => key.toString());
        }

        if (accountKeys.length < 2) {
          continue;
        }

        const preBalances = meta.preBalances || [];
        const postBalances = meta.postBalances || [];

        let solSpent = false;
        for (let i = 0; i < accountKeys.length; i++) {
          const preBalance = preBalances[i] || 0;
          const postBalance = postBalances[i] || 0;
          if (postBalance < preBalance) {
            solSpent = true;
            break;
          }
        }

        if (!solSpent) {
          continue;
        }

        const preTokenBalances = meta.preTokenBalances || [];
        const postTokenBalances = meta.postTokenBalances || [];

        const tokenBalanceChanges: number[] = [];

        for (let i = 0; i < accountKeys.length; i++) {
          const accountKey = accountKeys[i];

          const preTokenBalance = preTokenBalances.find(
            (balance: any) => balance.owner === accountKey && balance.mint === tokenMint
          );
          const postTokenBalance = postTokenBalances.find(
            (balance: any) => balance.owner === accountKey && balance.mint === tokenMint
          );

          if (preTokenBalance && postTokenBalance) {
            const preAmount = preTokenBalance.uiTokenAmount.uiAmount || 0;
            const postAmount = postTokenBalance.uiTokenAmount.uiAmount || 0;
            const change = postAmount - preAmount;
            tokenBalanceChanges.push(change);
          } else if (!preTokenBalance && postTokenBalance) {
            const postAmount = postTokenBalance.uiTokenAmount.uiAmount || 0;
            tokenBalanceChanges.push(postAmount);
          }
        }

        const totalBuyAmount = tokenBalanceChanges
          .filter((change) => change > 0)
          .reduce((sum, amount) => sum + amount, 0);

        if (totalBuyAmount > 0) {
          buyAmounts.push(totalBuyAmount);
        }
      } catch (err) {
        console.error("Error extracting buy amounts:", err);
      }
    }

    return buyAmounts;
  }

  private async fetchTotalSupplyAndDecimals(tokenMint: string): Promise<{ totalSupply: number; decimals: number }> {
    try {
      const mintPublicKey = new PublicKey(tokenMint);
      const mintAccountInfo = await this.connection.getParsedAccountInfo(mintPublicKey);

      if (!mintAccountInfo.value || !mintAccountInfo.value.data) {
        throw new Error(`Failed to fetch mint account info for token ${tokenMint}`);
      }

      const totalSupplyRaw = (mintAccountInfo.value.data as any).parsed.info.supply;
      const decimals = (mintAccountInfo.value.data as any).parsed.info.decimals;

      const totalSupply = totalSupplyRaw / Math.pow(10, decimals);

      return {
        totalSupply,
        decimals,
      };
    } catch (err) {
      throw err;
    }
  }

  public async analyzeBuys(
    tokenMint: string,
    blockNumber: number,
    txidToSkip?: string
  ): Promise<{ totalBuys: number; percentageOfTotalSupply: number }> {
    try {
      if (!tokenMint || !this.isValidPublicKey(tokenMint)) {
        throw new Error(`Invalid token mint address: ${tokenMint}`);
      }

      const transactions = await this.fetchTransactionsInRange(tokenMint, blockNumber);
      const buyAmounts = await this.extractBuyAmounts(transactions, tokenMint, txidToSkip);
      const { totalSupply } = await this.fetchTotalSupplyAndDecimals(tokenMint);

      const totalBuys = buyAmounts.reduce((sum, amount) => sum + amount, 0);
      let percentageOfTotalSupply = (totalBuys / totalSupply) * 100;
      percentageOfTotalSupply > 100 ? percentageOfTotalSupply = 100: percentageOfTotalSupply = percentageOfTotalSupply
      console.log(`Token Buy Analysis Results: {
        totalBuys: ${totalBuys},
        totolSupply: ${totalSupply}
        percentageOfTotalSupply: ${percentageOfTotalSupply},
      }`);
      return {
        totalBuys,
        percentageOfTotalSupply,
      };
    } catch (err) {
      console.error("Error analyzing buys:", err);
      throw err;
    }
  }
}