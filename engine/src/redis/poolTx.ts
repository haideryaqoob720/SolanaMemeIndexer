import { RedisClientType } from "redis";
import getRedisClient from "./store";

export interface poolTxType {
    mint: string;
    pool: string;
    isBuy: boolean;
    solAmount: number;
    tokenAmount: number;
    dex: number;
    user: string;
    tokenPriceInSol: number;
    isLiquidityRemoved?: boolean;
    timestamp: number;
    signature: string;
}

export class PoolTxStore {
    private client: RedisClientType;
    private poolsKey: string = "poolTx";
    constructor(client: RedisClientType) {
        this.client = client;
    }
    private getTxField(data: poolTxType) {
        return `${data.signature}:${data.isBuy}:${data.pool}:${data.mint}:${data.solAmount}:${data.tokenAmount}:${data.timestamp}`;
    }
    async addTx(data: poolTxType) {
        try {
            const txFeild: string = this.getTxField(data);
            await this.client.hSet(
                this.poolsKey,
                txFeild,
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log("error creating tx in cache", error.message);
        }
    }
    async getAllTx() {
        const data = await this.client.hGetAll(this.poolsKey);
        const transactions = Object.entries(data)
            .map(([field, value]) => {
                try {
                    const parsedValue: poolTxType = JSON.parse(value);
                    const transaction: poolTxType = {
                        mint: String(parsedValue.mint),
                        isBuy: Boolean(parsedValue.isBuy),
                        pool: String(parsedValue.pool),
                        user: String(parsedValue.user),
                        solAmount: Number(parsedValue.solAmount),
                        tokenAmount: Number(parsedValue.tokenAmount),
                        dex: Number(parsedValue.dex),
                        timestamp: Number(parsedValue.timestamp),
                        tokenPriceInSol: parsedValue.tokenPriceInSol,
                        signature: parsedValue.signature,
                        isLiquidityRemoved: parsedValue?.isLiquidityRemoved,
                    };
                    return transaction;
                } catch (err) {
                    console.error(err);
                    return null;
                }
            })
            .filter(Boolean);
        return transactions;
    }

    async deleteAllTx(transactions: poolTxType[]) {
        await Promise.all(
            transactions.map(async (tx) => {
                await this.client.hDel(this.poolsKey, this.getTxField(tx));
            }),
        );
    }
}
let poolTxCache: PoolTxStore | null = null;

async function getPoolTxStore() {
    const tokenMap = await getRedisClient();
    const client: any = tokenMap.getClient();
    if (!poolTxCache) {
        poolTxCache = new PoolTxStore(client);
    }
    return poolTxCache;
}

export default getPoolTxStore;
