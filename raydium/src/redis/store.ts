import { createClient } from "redis";
// import { swapLogger, logger } from "../utils/logger";
const { swapLogger, logger } = require("../utils/logger");
const axios = require("axios");
import { Prisma, PrismaClient } from "@prisma/client";
import { getAllMetrics, getVaults } from "../filters/filters";
import { loggerSwap } from "../utils/swapLogger";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getPumpFunMetrics } from "../filters/filtersv2";
const createLogger = require("../utils/logger");
import { BN } from "@coral-xyz/anchor";
import { realTimeMetrics } from "../filters/pumpFilters/realTimeMetrics";
import { getTokenHolders } from "../filters/holders";
import {
    createDefaultRaydiumToken,
    createDefaultTransaction,
    RaydiumTokenCreateInput,
    TokenCreateInput,
    TransactionCreateInput,
} from "../utils/defaultValues";
import { createRayToken } from "../db/addToken";
import { tokenHolder } from "../types";
import { getRaydiumMetrics } from "../filters/getRaydiumFilters";
import { idlAddress } from "@coral-xyz/anchor/dist/cjs/idl";
import { deletePumpToken } from "../db/deletePumpToken";
// import { trendingMetrics } from "./types";

// const winston = require("winston");

export interface MemeTokenTest {
    id: number;
    mint: string;
    name?: string;
    uri?: string;
    symbol?: string;
    socials: string[];
    top10holderEquity?: number;
    creatorEquity?: number;
    totalSupply?: number;
    lpBurned?: boolean;
    lpBurnedAmount?: number;
    mintable?: boolean;
    freezeable?: boolean;
    tax?: boolean;
    liquidityLock?: boolean;
    bondingCurve?: string;
    creator?: string;
    bondingProgress?: number;
    marketCap?: number;
    reserveSol?: number;
    reserveToken?: number;
    status?: number;
    totalHolders?: number;
    buyCount: number;
    sellCount: number;
    updated_at: string;
}

export class RedisCache {
    private client;
    private hashKey: string = "meme_token_test_alpha";
    private betaKey: string = "meme_token_test_beta";
    private tokensKey: string = "tokens";
    private pumpKey: string = "pump";
    private raydiumKey: string = "raydium";
    private transactionsKey: string = "transactions";
    private hot_monitorKey: string = "hot_monitor";
    private lockKey: string = "process_lock";
    private newTokens: string = "newTokens";
    private holdersKey: string = "holders";
    private solanaKey: string = "solana";
    private trendingMetricsKey: string = "trendingMetrics";

    private completedKey: string = "completedMint";
    private prisma: PrismaClient;

    constructor() {
        this.client = createClient({
            url:
                process.env.REDIS_URL ??
                "redis://default:redisLamboRadar@46.4.21.252:6379/0",
        });
        this.client.on("error", (err) =>
            console.error("Redis Client Error", err),
        );
        this.prisma = new PrismaClient();
    }

    async initialize(isAlpha: boolean) {
        try {
            const records = await this.prisma.meme_token_test.findMany();
            console.log(`feteched ${records.length} form db`);
            logger.info(`feteched ${records.length} form db`);
            records.forEach((record: any) => {
                // console.log(record.mint);
                this.create(record.mint, record, 0);
            });
            console.log(
                `Loaded ${records.length} meme token records into memory`,
            );
            logger.info(
                `Loaded ${records.length} meme token records into memory`,
            );
        } catch (error) {
            logger.error("Failed to initialize meme token records:", error);
            throw error;
        }
    }
    async connect() {
        await this.client.connect();
        // console.log("Connected to Redis");
    }

    async disconnect() {
        await this.client.disconnect();
        // console.log("Disconnected from Redis");
    }

    async create(
        mint: string,
        data: any,
        table?: number, // numbers for the tables 0 is for tokens. 1 is for pump fun. if undefined then the key is alpha
    ): Promise<void> {
        // isAlpha?
        if (table === 0) {
            try {
                // console.log("creating", mint)
                await this.client.hSet(
                    this.tokensKey,
                    mint.toString(),
                    JSON.stringify(data),
                );
            } catch (error: any) {
                console.log("error creating token in cache", error.message);
            }
        } else if (table === 1) {
            try {
                await this.client.hSet(
                    this.pumpKey,
                    mint.toString(),
                    JSON.stringify(data),
                );
            } catch (error: any) {
                console.log("error creating pump in cache", error.message);
            }
        } else if (table === 2) {
            try {
                await this.client.hSet(
                    this.raydiumKey,
                    mint.toString(),
                    JSON.stringify(data),
                );
            } catch (error: any) {
                console.log("error creating ray in cache", error.message);
            }
        } else if (table === 3) {
            // console.log("pump tx added")
            try {
                await this.client.hSet(
                    this.transactionsKey,
                    mint.toString(),
                    JSON.stringify(data),
                );
            } catch (error: any) {
                console.log("error creating tx in cache", error.message);
            }
        } else if (table === 4) {
            try {
                await this.client.hSet(
                    this.hot_monitorKey,
                    mint.toString(),
                    JSON.stringify(data),
                );
            } catch (error: any) {
                console.log("error creating hotM in cache", error.message);
            }
        } else {
            try {
                await this.client.hSet(
                    this.hashKey,
                    mint.toString(),
                    JSON.stringify(data),
                );
            } catch (error: any) {
                console.log("error creating default in cache", error.message);
            }
        }
        // : await this.client.hSet(
        //     this.betaKey,
        //     mint.toString(),
        //     JSON.stringify(data)
        //   );
    }

    async setSolanaPrice(price: string) {
        // try {
        //   const response:any = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT")
        //   console.log(response.data)
        //   await this.client.hSet(this.solanaKey, "solPrice", response.data.price.toString())
        // } catch (error:any) {
        //   console.log("error getting sol Price", error.message)
        // }
        await this.client.hSet(this.solanaKey, "solPrice", price.toString());
    }
    async getSolPrice(): Promise<number> {
        const data = await this.client.hGet(this.solanaKey, "solPrice");
        return data ? parseFloat(data) : 199.69;
    }

    async readRayToken(mint: string): Promise<RaydiumTokenCreateInput | null> {
        let data = await this.client.hGet(this.raydiumKey, mint.toString());
        return data ? JSON.parse(data) : null;
    }

    async readToken(mint: string): Promise<any | null> {
        const data = await this.client.hGet(this.tokensKey, mint.toString());
        return data ? JSON.parse(data) : null;
    }
    async readPump(mint: string) {
        const data = await this.client.hGet(this.pumpKey, mint.toString());
        return data ? JSON.parse(data) : null;
    }
    async getAllPump() {
        const data = await this.client.hGetAll(this.pumpKey);
        // return Object.values(data).map((value) => JSON.parse(value));
        return Object.values(data).map((value) => {
            const parsedValue = JSON.parse(value);
            const { id, token, mint, buyCount, sellCount, ...rest } =
                parsedValue;
            return { mint, rest };
        });
        // return Object.fromEntries(Object.keys(data).map(mint => [mint, {}]));
    }

    async addHolder(mint: string, holder: tokenHolder, isBuy: boolean) {
        const data = await this.getAllHoldersFromCache(mint);
        // console.log(data, mint,"<----------------------")
        if (data) {
            const existingHolders: tokenHolder[] = data;
            // const existingHolders:tokenHolder[] = JSON.parse(data)
            const existingIndex = existingHolders.findIndex(
                (h) => h.user === holder.user,
            );
            // console.log(existingIndex, "index")
            if (existingIndex !== -1) {
                // console.log("existing holder", holder)
                // console.log(isBuy, "buy")
                if (isBuy) {
                    existingHolders[existingIndex].balance += holder.balance;
                    // existingIndex.balance += holder.balance
                } else {
                    existingHolders[existingIndex].balance -= holder.balance;
                    // existingIndex.balance -= holder.balance
                }
            } else {
                existingHolders.push(holder);
                // console.log(existingHolders.length, "holders", mint)
            }
            existingHolders.sort((a, b) => b.balance - a.balance);
            await this.client.hSet(
                this.holdersKey,
                mint.toString(),
                JSON.stringify([...existingHolders]),
            );
        } else {
            console.log("🔯 new mint holder", mint);
            await this.client.hSet(
                this.holdersKey,
                mint.toString(),
                JSON.stringify(holder),
            );
        }
    }

    async getAllHoldersFromCache(
        mint: string,
    ): Promise<tokenHolder[] | undefined> {
        // const tokenHolders = await this.client.hGet(this.holdersKey, mint.toString())
        // const data = tokenHolders ? JSON.parse(tokenHolders) : []
        // return [...data]
        try {
            const tokenHolders = await this.client.hGet(
                this.holdersKey,
                mint.toString(),
            );
            if (!tokenHolders) {
                return [];
            }
            const data = JSON.parse(tokenHolders);
            if (!Array.isArray(data)) {
                if (typeof data === "object" && data !== null) {
                    // return Object.entries(data);
                }
                // If it's neither array nor object, return empty array
                return [];
            }

            return data;
        } catch (error) {
            console.error("Error processing token holders:", error);
            return [];
        }
    }

    async calculateTop10(mint: string): Promise<number | undefined> {
        const allHolders = await this.getAllHoldersFromCache(mint);
        const existingMint = await this.readToken(mint);
        if (allHolders && existingMint) {
            if (Array.isArray(allHolders)) {
                allHolders.sort((a, b) => b.balance - a.balance);
                const top10 = allHolders.slice(
                    0,
                    Math.min(10, allHolders.length),
                );
                const sum = top10.reduce(
                    (sum, holder) => sum + (holder.balance || 0),
                    0,
                );
                const percentage = (sum / existingMint.total_supply) * 100;
                return percentage;
            }
        } else {
            console.log("not found");
            return 0;
        }
    }

    async getHolderCount(mint: string) {
        const data = await this.getAllHoldersFromCache(mint.toString());
        if (data) {
            return data.length;
        } else {
            return 0;
        }
    }

    async getAllRaydium() {
        const data = await this.client.hGetAll(this.raydiumKey);
        return Object.values(data).map((value) => JSON.parse(value));
    }

    async readTx(signature: string) {
        return this.client.hGet(this.transactionsKey, signature);
    }
    async deleteFromTx(signature: string) {
        await this.client
            .hDel(this.transactionsKey, signature.toString())
            .then((res: any) => {
                // console.log("deleted key", res)
            })
            .catch((err: any) => {
                console.log("failed to delete", err.message);
            });
    }

    async addTx(signature: string, data: any) {
        try {
            await this.client.hSet(
                this.transactionsKey,
                signature.toString(),
                JSON.stringify(data),
            );
        } catch (error: any) {
            console.log("error creating tx in cache", error.message);
        }
    }

    async deleteManyTokens(tokens: string[]) {
        await Promise.all(
            tokens.map(async (token, index) => {
                await this.client.hDel(this.tokensKey, token.toString());
            }),
        )
            .then(() => {
                console.log(`deleted ${tokens.length} tokens from cache`);
            })
            .catch(() => {
                console.log("failed to delete many tokens");
            });
    }

    async deletePumpToken(token: string) {
        await this.client.hDel(this.pumpKey, token.toString());
    }

    async deleteManyPump(tokens: string[]) {
        await Promise.all(
            tokens.map(async (token, index) => {
                await this.client.hDel(this.pumpKey, token.toString());
            }),
        )
            .then(() => {
                console.log(`deleted ${tokens.length} pump tokens from cache`);
            })
            .catch(() => {
                console.log("failed to delete many pump tokens");
            });
    }

    async deleteManyTx(signatures: { signature: string }[]) {
        await Promise.all(
            signatures.map(async (sig, index) => {
                await this.client.hDel(
                    this.transactionsKey,
                    sig.signature.toString(),
                );
            }),
        )
            .then(() => {
                console.log(`deleted ${signatures.length} tx from cache`);
            })
            .catch(() => {
                console.log("failed to delete many tx tokens");
            });
    }

    async update(
        mint: string,
        partialData: Partial<MemeTokenTest>,
        isAlpha: boolean,
    ): Promise<void> {
        const existingData = await this.readPump(mint);
        if (!existingData) {
            // throw new Error(`Data with mint ${mint} does not exist.`);
        } else {
            const updatedData = { ...existingData, ...partialData };
            // console.log(updatedData);
            await this.client.hSet(
                this.hashKey,
                mint,
                JSON.stringify(updatedData),
            );
            // console.log("updated token");
            // createLogger.info("updated token after adding to db");
        }
    }
    async acquireLock() {
        const LOCK_TTL = 300;
        return await this.client.set(this.lockKey, "1", {
            NX: true,
            EX: LOCK_TTL,
        });
        // return await this.client.set(this.lockKey, '1', "NX", "EX", LOCK_TTL)
    }
    async removeLock() {
        await this.client.del(this.lockKey);
    }
    async getTxBatches(cursor: number) {
        const res = await this.client.hScan(this.transactionsKey, cursor, {
            COUNT: 100,
        });
        // console.log(res)
        return res;
    }
    async bondingCompleted(mint: string, timestamp: number) {
        let tokenMetrics;
        tokenMetrics = await this.readPump(mint);
        if (tokenMetrics) {
            tokenMetrics.updated_at = new Date(timestamp * 1000).toISOString();
            // } else {
            //   // tokenMetrics = await getAllMetrics(mint.toString(), null);
            //   // tokenMetrics.updated_at = new Date(timestamp*1000).toISOString();
            // }
            console.log(tokenMetrics);
            const mintAddress = new PublicKey(mint);
            // const { baseVault, quoteVault, marketAccount } = await getVaults(
            //   mintAddress
            // );
            // console.log(marketAccount?.pubkey.toBase58(), "marketAccount")
            // const ray_token = createDefaultRaydiumToken(
            //   mint,
            //   marketAccount?.pubkey.toBase58() ?? ""
            // );
            // ray_token.reserve_sol = tokenMetrics.reserveSol;
            // ray_token.reserve_token = tokenMetrics.reserveToken;
            // if (tokenMetrics?.mint && tokenMetrics?.creator) {
            //   const tokenData = await getAllMetrics(
            //     tokenMetrics?.mint,
            //     tokenMetrics?.creator,
            //     tokenMetrics?.name,
            //     tokenMetrics?.symbol,
            //     tokenMetrics?.uri
            //   );
            //   console.log(tokenData);
            // }
            // await this.client.hSet(
            //   this.completedKey,
            //   mint.toString(),
            //   JSON.stringify(tokenMetrics)
            // );
            const ray_token = await getRaydiumMetrics(mint);
            console.log("Raydium tokens data...");
            console.log(ray_token);
            // console.log(ray_token, "rayToken")
            await this.create(mint, ray_token, 2);
            await createRayToken(ray_token, mint);
            await this.deletePumpToken(mint);
            await deletePumpToken(mint);
            // await this.delete(mint.toString());
            console.log("bonding process completed");
        }
    }
    async updateFromPumpfun(
        mint: string,
        isBuy: boolean,
        signature?: string,
        virtualSolReserves?: number,
        virtualTokenReserves?: number,
        realSolReserves?: number,
        realTokenReserves?: BN,
        args?: any,
    ) {
        // let existingMint = await this.read(mint, 1)
        let existingMint = await this.readPump(mint);
        // let tokenMint = await this.read(mint, 0)
        let tokenMint = await this.readToken(mint);
        // console.log(await this.read("4Tq6sLPfWPLbgnPD59Pb31PaNKbAKSLwGDVz4AAKpump", 0), "cache find")
        // console.log(existingMint, tokenMint, "pump cache")
        if (existingMint && tokenMint) {
            // console.log(mint)
            // console.log(existingMint, tokenMint, "mints")
            isBuy ? existingMint.buy_count++ : existingMint.sell_count++;
            isBuy ? tokenMint.buy_count++ : tokenMint.sell_count++;
            // console.log("Mint for buy/sell:");
            // console.log("IsBuy", isBuy);
            // console.log("Buy: " + existingMint.buy_count+" sell: "+existingMint.sell_count);

            if (
                virtualSolReserves &&
                virtualTokenReserves &&
                realSolReserves &&
                realTokenReserves
            ) {
                // console.log("Passed Data....");
                //   console.log(virtualSolReserves);
                //   console.log(virtualTokenReserves);
                //   console.log(realSolReserves);
                //   console.log(realTokenReserves);
                const {
                    priceSol,
                    progress,
                    marketCap,
                    solReserve,
                    tokenReserve,
                } = realTimeMetrics(
                    virtualSolReserves,
                    virtualTokenReserves,
                    realSolReserves,
                    realTokenReserves,
                );
                // console.log("Converted into number data...");
                // console.log(tokenMint);
                // console.log("price sol", priceSol);
                // console.log("progress",progress);
                // console.log("m cat",marketCap);
                // console.log("sol reserve ",solReserve);
                // console.log("token reserve ",tokenReserve);
                // console.log("Lampports : ", LAMPORTS_PER_SOL);

                // console.log("Mint is here: ", mint);
                // console.log(marketCap+" , "+priceSol);

                existingMint.market_cap = marketCap;
                tokenMint.market_cap = marketCap;
                existingMint.reserve_sol = solReserve.toFixed(8);
                existingMint.reserve_token = tokenReserve.toFixed(8);
                existingMint.bonding_progress = progress;
                existingMint.updated_at = new Date().toISOString();
                await this.client.hSet(
                    this.pumpKey,
                    mint,
                    JSON.stringify(existingMint),
                );

                const txSol = parseFloat(
                    (args.data.solAmount.toNumber() / LAMPORTS_PER_SOL).toFixed(
                        8,
                    ),
                );
                const txToken = parseFloat(
                    (args.data.tokenAmount.toNumber() / 1000000).toFixed(8),
                );
                let txData = createDefaultTransaction(
                    mint,
                    args.data.isBuy,
                    args.data.user,
                    // parseFloat((args.data.solAmount.toNumber() /LAMPORTS_PER_SOL).toFixed(8)),
                    txSol,
                    // parseFloat((args.data.tokenAmount.toNumber() /1000000).toFixed(8)),
                    txToken,
                    1,
                    args.data.timestamp.toNumber(),
                    priceSol ?? 0,
                    signature ?? "",
                );

                tokenMint.sol_volume = (
                    parseFloat(tokenMint.sol_volume) + txSol
                ).toString();
                tokenMint.token_volume = (
                    parseFloat(tokenMint.token_volume) + txToken
                ).toString();
                tokenMint.total_tx++;

                await this.create(signature ?? "", txData, 3);

                const holder: tokenHolder = {
                    user: args.data.user.toBase58(),
                    balance: parseFloat(
                        (args.data.tokenAmount.toNumber() / 1000000).toFixed(8),
                    ),
                };
                await this.addHolder(mint, holder, args.data.isBuy);
                const top10 = await this.calculateTop10(mint);
                tokenMint.top_10_holder_equity = top10;
                tokenMint.total_holders = await this.getHolderCount(mint);

                this.client.hSet(
                    this.tokensKey,
                    mint,
                    JSON.stringify(tokenMint),
                );
                if (args.data.user === tokenMint.creator) {
                    console.log("🌟 creator tx", mint, "/n", signature);
                    if (tokenMint.creator_balance) {
                        if (isBuy) {
                            tokenMint.creator_balance +=
                                args.data.tokenAmount.toNumber() / 1000000;
                        } else {
                            tokenMint.creator_balance -=
                                args.data.tokenAmount.toNumber() / 1000000;
                        }
                        this.client.hSet(
                            this.tokensKey,
                            mint,
                            JSON.stringify(tokenMint),
                        );
                        console.log(tokenMint, "tokenMint");
                    }
                }
                // console.log("added mint to tx", tokenMint.mint, mint)
            }
        } else {
            // console.log("❗ mint not found");
        }
    }

    async delete(mint: string): Promise<void> {
        await this.client.hDel(this.hashKey, mint);
    }
    async flush() {
        await this.client.flushDb();
    }
    // async getAll(): Promise<Record<string, MemeTokenTest>> {
    async getAll(): Promise<MemeTokenTest[]> {
        const data = await this.client.hGetAll(this.hashKey);
        return Object.values(data).map((value) => JSON.parse(value));
    }
    async getAllTokens() {
        const data = await this.client.hGetAll(this.tokensKey);
        return Object.values(data).map((value) => JSON.parse(value));
    }
    async getAllRayTokens() {
        const data = await this.client.hGetAll(this.raydiumKey);
        const test = Object.entries(data).map(([key, value]) => ({
            mint: key,
            ...JSON.parse(value),
        }));
        // console.log(test)
        return test;
    }
    // async getAllTx(): Promise<Prisma.transactionsCreateManyInput[]> {
    async getAllTx(): Promise<any[]> {
        const data = await this.client.hGetAll(this.transactionsKey);
        // console.log(data, "from store tx");
        // return Object.values(data).map((value) => JSON.parse(value));
        // const transactions = Object.entries(data).map(([field, value]) => {
        //   const parsedValue = JSON.parse(value);
        //   return {
        //     signature: field, // This will be your foreign key or reference field
        //     ...parsedValue, // Spread the parsed JSON values
        //   };
        // });
        const transactions = Object.entries(data).map(([signature, value]) => {
            try {
                const parsedValue = JSON.parse(value);

                // Create transaction object with type conversion
                const transaction = {
                    mint: String(parsedValue.mint),
                    is_buy: Boolean(parsedValue.is_buy),
                    user: String(parsedValue.user),
                    sol_amount: Number(parsedValue.sol_amount),
                    token_amount: Number(parsedValue.token_amount),
                    dex: Number(parsedValue.dex),
                    timestamp: Number(parsedValue.timestamp),
                    token_price_in_sol: parsedValue.token_price_in_sol,
                    signature: signature,
                };
                return transaction;
            } catch (error) {
                console.error(
                    `Error processing transaction with signature ${signature}:`,
                    error,
                );
            }
        });

        // console.log(transactions, "from store tx");
        return transactions;
    }
    async flushTx() {
        await this.client.del(this.transactionsKey);
    }
    async reset() {
        // await this.flush();
        // const records = await this.prisma.meme_token_test.findMany();
        // console.log(`feteched ${records.length} form db`);
        // records.forEach((record: any) => {
        //   this.create(record.mint, record, 0);
        // });
        // await this.client.del(this.tokensKey)
        // await this.client.del(this.pumpKey)
        // await this.client.del(this.transactionsKey)
        await this.client.flushDb();
        console.log("reset cache");
    }
}

let tokenMap: RedisCache | null = null;
async function getRedisClient(): Promise<RedisCache> {
    if (!tokenMap) {
        tokenMap = new RedisCache();
        await tokenMap.connect();
    }
    return tokenMap;
}

export default getRedisClient;
