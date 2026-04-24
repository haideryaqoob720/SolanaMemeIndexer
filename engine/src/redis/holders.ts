import { createClient, RedisClientType } from "redis";
import getRedisClient from "./store";

interface HolderInfo {
    account: string;
    balance: number;
    balanceString: string;
}

interface HolderWithPercentage extends HolderInfo {
    percentage: string;
}

interface Top10Result {
    holders: HolderWithPercentage[];
    top10HoldingPercentage: string;
    top10Sum: number;
    top10SumString: string;
}

interface BatchUpdateItem {
    account: string;
    amount: number;
    txType: "buy" | "sell" | "set";
}

interface BatchUpdateResult {
    account: string;
    newBalance: number;
}

interface SwapTransactionResult {
    buyer: { account: string; newBalance: number };
    seller: { account: string; newBalance: number };
}

type TransactionType = "buy" | "sell" | "set";

export class TokenHolderStore {
    private client: RedisClientType;

    constructor(client: RedisClientType) {
        this.client = client;
    }

    // Get holders within a balance range
    async getHoldersByBalanceRange(
        mint: string,
        minBalance: number,
        maxBalance: number,
    ): Promise<HolderInfo[]> {
        const minNum = this._validateBalance(minBalance);
        const maxNum = this._validateBalance(maxBalance);
        const key = `holders:${mint}`;

        // Use ZRANGEBYSCORE - the score IS the balance
        const holders = await this.client.zRangeByScoreWithScores(
            key,
            minNum,
            maxNum,
        );

        const result: HolderInfo[] = [];
        for (const holder of holders) {
            const balance = Number(holder.score);
            result.push({
                account: holder.value,
                balance: balance,
                balanceString: balance.toString(),
            });
        }
        return result;
    }

    // Validate and sanitize balance input
    private _validateBalance(balance: number | string): number {
        let numBalance: number;

        if (typeof balance === "string") {
            numBalance = parseFloat(balance);
        } else if (typeof balance === "number") {
            numBalance = balance;
        } else {
            throw new Error("Balance must be a number or string");
        }

        if (isNaN(numBalance) || numBalance < 0) {
            throw new Error(`Invalid balance: ${balance}`);
        }

        // Round to avoid floating point precision issues
        return Math.round(numBalance * 1e9) / 1e9; // 9 decimal precision
    }

    // Add/Update holder balance based on transaction type - maintains sorted order
    async updateHolder(
        mint: string,
        holderAccount: string,
        amount: number | string,
        txType: TransactionType,
    ): Promise<number> {
        const amountNum = this._validateBalance(amount);
        const key = `holders:${mint}`;

        // Get current balance first
        const currentBalanceScore = await this.client.zScore(
            key,
            holderAccount,
        );
        const currentBalance =
            currentBalanceScore !== null ? Number(currentBalanceScore) : 0;

        let newBalance: number;

        if (txType === "buy") {
            newBalance = currentBalance + amountNum;
        } else if (txType === "sell") {
            newBalance = Math.max(0, currentBalance - amountNum); // Ensure balance doesn't go negative
        } else if (txType === "set") {
            newBalance = amountNum;
        } else {
            throw new Error('Invalid txType. Must be "buy", "sell", or "set"');
        }

        // Validate against total supply to prevent exceeding it
        const totalSupply = await this.getTotalSupply(mint);
        if (newBalance > totalSupply) {
            // console
            //     .warn
            //     // `Balance ${newBalance} would exceed total supply ${totalSupply} for ${holderAccount}, capping at total supply`,
            //     ();
            newBalance = totalSupply;
        }

        // Round to avoid floating point issues
        newBalance = Math.round(newBalance * 1e9) / 1e9;

        // Update the holder balance in Redis
        await this.client.zAdd(key, {
            score: newBalance, // Balance as score for sorting
            value: holderAccount, // Account address as member
        });

        return newBalance;
    }

    // Get top holders in descending order
    async getTopHolders(
        mint: string,
        limit: number = 100,
    ): Promise<HolderInfo[]> {
        const key = `holders:${mint}`;
        const holders = await this.client.zRangeWithScores(key, 0, limit - 1, {
            REV: true, // Get in descending order
        });

        const result: HolderInfo[] = [];
        for (const holder of holders) {
            const balance = Number(holder.score);
            result.push({
                account: holder.value,
                balance: balance,
                balanceString: balance.toString(),
            });
        }
        return result;
    }

    // Get top 10 holders with individual percentages and collective percentage
    async getTop10WithPercentage(
        mint: string,
        totalSupply: number,
    ): Promise<Top10Result | null> {
        try {
            // Validate total supply is not zero
            if (totalSupply <= 0) {
                throw new Error("Total supply must be greater than zero");
            }

            const top10 = await this.getTopHolders(mint, 10);

            // Calculate sum of top 10 balances
            let top10Sum = 0;
            const holdersWithPercentage: HolderWithPercentage[] = top10.map(
                (holder) => {
                    top10Sum += holder.balance;

                    // Calculate individual percentage
                    const percentage = (holder.balance / totalSupply) * 100;

                    return {
                        account: holder.account,
                        balance: holder.balance,
                        balanceString: holder.balanceString,
                        percentage: percentage.toFixed(2), // Show 2 decimal places
                    };
                },
            );

            // Ensure sum doesn't exceed total supply
            if (top10Sum > totalSupply) {
                // console.warn(
                //     `Top 10 sum ${top10Sum} exceeds total supply ${totalSupply}, adjusting proportionally`,
                // );

                // Proportionally reduce all balances to fit within total supply
                const scaleFactor = totalSupply / top10Sum;
                top10Sum = 0;

                holdersWithPercentage.forEach((holder) => {
                    holder.balance =
                        Math.round(holder.balance * scaleFactor * 1e9) / 1e9;
                    holder.balanceString = holder.balance.toString();
                    const percentage = (holder.balance / totalSupply) * 100;
                    holder.percentage = percentage.toFixed(2);
                    top10Sum += holder.balance;
                });
            }

            // Calculate top 10 collective holding percentage
            const top10HoldingPercentage = (top10Sum / totalSupply) * 100;

            return {
                holders: holdersWithPercentage,
                top10HoldingPercentage: top10HoldingPercentage.toFixed(2),
                top10Sum: top10Sum,
                top10SumString: top10Sum.toString(),
            };
        } catch (error: any) {
            console.log(error.message, mint, "top10 percentage", error);
            return null;
        }
    }

    // Remove holder (when balance becomes 0)
    async removeHolder(mint: string, holderAccount: string): Promise<number> {
        const key = `holders:${mint}`;
        return await this.client.zRem(key, holderAccount);
    }
    async removeHoldersForMint(mint: string) {
        try {
            await this.client.del(`holders:${mint}`);
            console.log("deleted holders");
        } catch (error: any) {
            console.log(`could not delete holders for ${mint}`);
        }
    }

    // Get holder count
    async getHolderCount(mint: string): Promise<number> {
        const key = `holders:${mint}`;
        return await this.client.zCard(key);
    }

    // Get specific holder balance
    async getHolderBalance(
        mint: string,
        holderAccount: string,
    ): Promise<number | null> {
        const key = `holders:${mint}`;
        const balanceScore = await this.client.zScore(key, holderAccount);
        return balanceScore !== null ? Number(balanceScore) : null;
    }

    // Batch update multiple holders with transaction types
    async batchUpdateHolders(
        mint: string,
        holders: BatchUpdateItem[],
    ): Promise<BatchUpdateResult[]> {
        const results: BatchUpdateResult[] = [];
        const totalSupply = await this.getTotalSupply(mint);

        // Calculate total impact first to ensure we don't exceed supply
        let totalImpact = 0;
        for (const { amount, txType } of holders) {
            if (txType === "buy" || txType === "set") {
                totalImpact += this._validateBalance(amount);
            }
        }

        // Get current total holdings
        const currentTotal = await this.getCurrentTotalHoldings(mint);

        // Check if the batch update would exceed total supply
        if (currentTotal + totalImpact > totalSupply) {
            console.warn(
                `Batch update would exceed total supply, scaling down proportionally`,
            );
            const scaleFactor = (totalSupply - currentTotal) / totalImpact;

            // Process with scaled amounts
            for (const { account, amount, txType } of holders) {
                const scaledAmount =
                    txType === "buy" || txType === "set"
                        ? this._validateBalance(amount) * scaleFactor
                        : this._validateBalance(amount);

                const newBalance = await this.updateHolder(
                    mint,
                    account,
                    scaledAmount,
                    txType,
                );
                results.push({ account, newBalance });
            }
        } else {
            // Process sequentially with original amounts
            for (const { account, amount, txType } of holders) {
                const newBalance = await this.updateHolder(
                    mint,
                    account,
                    amount,
                    txType,
                );
                results.push({ account, newBalance });
            }
        }

        return results;
    }

    // Helper method to get current total holdings across all accounts
    private async getCurrentTotalHoldings(mint: string): Promise<number> {
        const key = `holders:${mint}`;
        const allHolders = await this.client.zRangeWithScores(key, 0, -1);

        return allHolders.reduce(
            (total, holder) => total + Number(holder.score),
            0,
        );
    }

    // Process a swap transaction (one buy, one sell)
    async processSwapTransaction(
        mint: string,
        buyer: string,
        seller: string,
        amount: number | string,
    ): Promise<SwapTransactionResult> {
        const amountNum = this._validateBalance(amount);

        // Execute both operations (sell first to free up supply)
        const sellerNewBalance = await this.updateHolder(
            mint,
            seller,
            amountNum,
            "sell",
        );
        const buyerNewBalance = await this.updateHolder(
            mint,
            buyer,
            amountNum,
            "buy",
        );

        return {
            buyer: { account: buyer, newBalance: buyerNewBalance },
            seller: { account: seller, newBalance: sellerNewBalance },
        };
    }

    // Set initial balance for new holders
    async setInitialBalance(
        mint: string,
        holderAccount: string,
        balance: number | string,
    ): Promise<number> {
        const balanceNum = this._validateBalance(balance);
        const totalSupply = await this.getTotalSupply(mint);

        // Ensure initial balance doesn't exceed total supply
        const finalBalance = Math.min(balanceNum, totalSupply);

        if (finalBalance !== balanceNum) {
            // console
            //     .warn
            //     // `Initial balance ${balanceNum} capped at total supply ${totalSupply}`,
            //     ();
        }

        const key = `holders:${mint}`;
        await this.client.zAdd(key, {
            score: finalBalance,
            value: holderAccount,
        });

        return finalBalance;
    }

    // Helper method to get total supply from external Redis key
    async getTotalSupply(mint: string): Promise<number> {
        const tokenMap = await getRedisClient();
        try {
            const token = await tokenMap.readToken(mint);
            if (!token) {
                return 100000000;
            }
            const totalSupply = parseInt(token.total_supply);
            return totalSupply;
        } catch (error: any) {
            console.log("error getting total supply", error.message);
            return 100000000;
        }
    }

    // Validate total holdings don't exceed supply (maintenance method)
    async validateTotalSupply(mint: string): Promise<{
        isValid: boolean;
        currentTotal: number;
        totalSupply: number;
    }> {
        const currentTotal = await this.getCurrentTotalHoldings(mint);
        const totalSupply = await this.getTotalSupply(mint);

        const isValid = currentTotal <= totalSupply;

        if (!isValid) {
            // console
            //     .warn
            //     // `Total holdings ${currentTotal} exceed total supply ${totalSupply} for mint ${mint}`,
            //     ();
        }

        return {
            isValid,
            currentTotal,
            totalSupply,
        };
    }

    // Fix supply overflow by proportionally reducing all balances
    async fixSupplyOverflow(mint: string): Promise<void> {
        const validation = await this.validateTotalSupply(mint);

        if (validation.isValid) {
            console.log(`No supply overflow detected for mint ${mint}`);
            return;
        }

        console.log(`Fixing supply overflow for mint ${mint}`);

        const scaleFactor = validation.totalSupply / validation.currentTotal;
        const key = `holders:${mint}`;
        const allHolders = await this.client.zRangeWithScores(key, 0, -1);

        // Update all holders proportionally
        for (const holder of allHolders) {
            const newBalance =
                Math.round(Number(holder.score) * scaleFactor * 1e9) / 1e9;
            await this.client.zAdd(key, {
                score: newBalance,
                value: holder.value,
            });
        }

        // console
        //     .log
        //     // `Fixed supply overflow for mint ${mint}, scaled by factor ${scaleFactor}`,
        //     ();
    }
    async getAllMints(): Promise<string[]> {
        const keys = await this.client.keys("holders:*");
        return keys.map((key) => key.split(":")[1]);
    }
}

let HolderCache: TokenHolderStore | null = null;

async function getHolderStore() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!HolderCache) {
        HolderCache = new TokenHolderStore(client);
    }
    return HolderCache;
}

export default getHolderStore;
export {
    HolderInfo,
    HolderWithPercentage,
    Top10Result,
    BatchUpdateItem,
    BatchUpdateResult,
    SwapTransactionResult,
    TransactionType,
};
