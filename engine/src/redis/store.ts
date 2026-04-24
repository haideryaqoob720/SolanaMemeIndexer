import { createClient } from "redis";
// import {Redis} from 'ioredis'
// import { swapLogger, logger } from "../utils/logger";
// const { swapLogger, logger } = require("../utils/logger");
// const axios = require("axios");
import {
    Prisma,
    PrismaClient,
    raydium_tokens,
    sniperOrders,
    tokens,
} from "@prisma/client";
// import { getAllMetrics, getVaults } from "../filters/filters";
// import { loggerSwap } from "../utils/swapLogger";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
// import { getPumpFunMetrics } from "../filters/filtersv2";
// const createLogger = require("../utils/logger");
import { BN } from "@coral-xyz/anchor";
import { realTimeMetrics } from "../filters/pumpFilters/realTimeMetrics";
import { getTokenHolders } from "../filters/holders";
import {
    createDefaultRaydiumToken,
    createDefaultTransaction,
    RaydiumTokenCreateInput,
    SniperCreateInput,
    TokenCreateInput,
    TransactionCreateInput,
} from "../utils/defaultValues";
import { createRayToken } from "../db/addToken";
import { realTimeTokenMetrics, tokenHolder } from "../types";
import { getRaydiumMetrics } from "../filters/getRaydiumFilters";
import { idlAddress } from "@coral-xyz/anchor/dist/cjs/idl";
import { deletePumpToken } from "../db/deletePumpToken";
import {
    addBN,
    convertBnToString,
    convertToBN,
    logRealTimeMetrics,
} from "../utils/helpers";
import { isDateAfter } from "@raydium-io/raydium-sdk-v2";
import { sniperOrderTest, trendingMetrics, trendingTokens } from "./types";
import { parse } from "path";
import { getConnectionName } from "ioredis/built/cluster/util";
import { config } from "../config";
import { divideBN } from "../pumpSwap/withdraw/utils";
import { addTxToAnalytics } from "../txnAnalytics/addToRedis";
import getTxAnalytics from "./txAnalytics";
// import tokenCache  from "./tokenStore";

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
    private tokenUpdateLock: string = "tokenUpdateLock";
    private newTokens: string = "newTokens";
    private holdersKey: string = "holders";
    private solanaKey: string = "solana";
    private sniperKey: string = "sniper";
    private activeOrders: string = "activeOrders";
    private trendingMetricsKey: string = "trendingMetrics";
    private trendingTokensKey: string = "trendingTokens";
    private sniperProcessLock: string = "sniperProcess";
    private updateLockKey: string = "dbUpdate";
    private completedKey: string = "completedMint";
    private prisma: PrismaClient;

    constructor() {
        //   this.client = createClient({socket:{
        //     // host:"136.243.172.118",
        //     host:"127.0.0.1",
        //     port:6379
        //   },
        //   // username:"default",
        //   password:"redisLamboRadar"
        //   const redisTest = new Redis({
        //   port: 6379, // Redis port
        //   host: "127.0.0.1", // Redis host
        //   username: "default", // needs Redis >= 6
        //   password: "redisLamboRadar",
        //   db: 0, // Defaults to 0
        // });
        // redisTest.get("test", (err:any, result:any) => {
        //   if (err) {
        //     console.error(err);
        //   } else {
        //     console.log(result); // Prints "value"
        //   }
        // });
        // });
        // this.client = createClient({url:"redis://default:redisLamboRadar@136.243.172.118:6379/0"})
        this.client = createClient({
            url:
                process.env.REDIS_URL ??
                "redis://default:redisLamboRadar@46.4.21.252:6379/0",
        });
        // this.client = createClient({})
        // this.client.auth({password:"redisLamboRadar"})
        this.client.on("error", (err) =>
            console.error("Redis Client Error Main", err),
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
        // await this.client.auth({password:"redisLamboRadar"})
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

    getClient() {
        return this.client;
    }

    async setTrendingMetrics(metrics: trendingMetrics) {
        try {
            await this.client.hSet(
                this.trendingMetricsKey,
                "adminMetrics",
                JSON.stringify(metrics),
            );
        } catch (error: any) {
            console.log(
                "error setting trending metrics in redis",
                error.message,
            );
        }
    }
    async getTrendingMetrics(): Promise<trendingMetrics | null | undefined> {
        try {
            const data = await this.client.hGet(
                this.trendingMetricsKey,
                "adminMetrics",
            );
            return data ? JSON.parse(data) : null;
        } catch (error: any) {
            console.log(
                "error getting trending metrics from redis",
                error.message,
            );
        }
    }

    async getSolPrice(): Promise<number> {
        const data = await this.client.hGet(this.solanaKey, "solPrice");
        return data ? parseFloat(data) : 199.69;
    }

    async readRayToken(
        mint: string,
    ): Promise<RaydiumTokenCreateInput | null | any> {
        let data = await this.client.hGet(this.raydiumKey, mint.toString());
        return data ? JSON.parse(data) : null;
    }

    async readRaydiumWithQuote(mint: string) {
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
            console.log(parsedValue, "store");
            const { id, token, mint, buyCount, sellCount, ...rest } =
                parsedValue;
            return { mint, rest };
        });
        // return Object.fromEntries(Object.keys(data).map(mint => [mint, {}]));
    }

    async getHoldersForAllMints() {
        const data = await this.client.hGetAll(this.holdersKey);
        return Object.values(data).map(([key, value]) => {
            const parsedValue = JSON.parse(value);
            return { key, parsedValue };
        });
    }

    async addHolder(
        mint: string,
        holder: tokenHolder,
        isBuy: boolean,
        shouldLog?: boolean,
    ) {
        const data = await this.getAllHoldersFromCache(mint);
        if (data === null) {
            return;
        }
        // if(shouldLog){
        //     console.log(data,"holder",holder,  mint,"<----------------------")
        //   }
        if (data && data.length > 0) {
            // if(shouldLog){
            //   console.log(data,"holder",holder,  mint,"<----------------------")
            // }
            let existingHolders: tokenHolder[] = data;
            // const existingHolders:tokenHolder[] = JSON.parse(data)
            // const existingIndex = existingHolders.findIndex(
            //   (h) => h.user === holder.user
            // );
            // let isNewHolder:boolean = false;
            // isNewHolder =  existingHolders.some((h)=>{
            //   // if(mint === config.monitorToken){
            //   //     console.log("\n",h,"existing holder1", holder.user,)
            //   //   }
            //   if(h.user === holder.user){
            //     // if(mint === config.monitorToken){
            //     //   console.log("🌟existing holder 2🌟", holder.user)
            //     // }
            //     isBuy ? h.balance += holder.balance : h.balance -= holder.balance
            //     isNewHolder = false;
            //     return
            //   }else{
            //     isNewHolder = true;
            //   }
            // })
            // const isNewHolder = existingHolders.filter((h,index)=>{
            //   if(existingHolders[index].user === h.user){
            //       if(h.user === holder.user){
            //       isBuy ? h.balance += holder.balance : h.balance -= holder.balance
            //       existingHolders[index].balance = h.balance
            //       return
            //     }
            //   }
            // })

            let isNewHolder: boolean = true;
            for (let index = 0; index < existingHolders.length; index++) {
                if (existingHolders[index].user === holder.user) {
                    isBuy
                        ? (existingHolders[index].balance =
                              Number(existingHolders[index].balance) +
                              Number(holder.balance))
                        : (existingHolders[index].balance =
                              Number(existingHolders[index].balance) -
                              Number(holder.balance));
                    isNewHolder = false;
                    break;
                }
            }
            // if(mint === config.monitorToken){
            //   console.log(isNewHolder.length, "filters holder")
            // }
            if (isNewHolder) {
                // if(mint === config.monitorToken){console.log("newHolder")}
                existingHolders = [...existingHolders, holder];
            }

            existingHolders.sort((a, b) => b.balance - a.balance);
            // console.log(existingHolders.length, "existingHolders", mint)
            await this.client.hSet(
                this.holdersKey,
                mint.toString(),
                JSON.stringify([...existingHolders]),
            );
        } else {
            if (shouldLog) {
                console.log("🔯 new mint holder", holder);
            }
            await this.client.hSet(
                this.holdersKey,
                mint.toString(),
                JSON.stringify([holder]),
            );
        }
    }

    async getAllHoldersFromCache(mint: string): Promise<tokenHolder[] | null> {
        // const tokenHolders = await this.client.hGet(this.holdersKey, mint.toString())
        // const data = tokenHolders ? JSON.parse(tokenHolders) : []
        // return [...data]
        try {
            const tokenHolders = await this.client.hGet(
                this.holdersKey,
                mint.toString(),
            );
            // if(mint === config.monitorToken){
            //   console.log(tokenHolders, "getAllHolders")
            // }
            if (!tokenHolders) {
                // console.log("no holders")
                // console.log(tokenHolders, "get all holders")
                return [];
            }
            const data = JSON.parse(tokenHolders);
            if (!Array.isArray(data)) {
                if (typeof data === "object" && data !== null) {
                    // return Object.entries(data);
                }
                // console.log()
                // If it's neither array nor object, return empty array
                return null;
            }

            return data;
        } catch (error) {
            console.error("Error processing token holders:", error);
            return null;
        }
    }

    async calculateTop10(mint: string): Promise<number | undefined> {
        const allHolders = await this.getAllHoldersFromCache(mint);
        if (allHolders === null) {
            console.log("no holders found for ", mint);
            return 0;
        }
        const existingMint = await this.readToken(mint);
        if (allHolders && allHolders.length > 0 && existingMint) {
            // console.log(`found ${allHolders.length} for ${mint}`);
            if (Array.isArray(allHolders)) {
                allHolders.sort((a, b) => b.balance - a.balance);
                const top10 = allHolders.slice(
                    0,
                    Math.min(10, allHolders.length),
                );
                // const sum = top10.reduce(
                //   (sum, holder) => sum + holder.balance
                // );
                let sum: number = 0;
                // top10.map((holder, index) => {
                //     sum += holder.balance;
                // });
                for (const holder of top10) {
                    // console.log(holder.balance, "balance");
                    sum = sum + Number(holder.balance);
                }

                const percentage: number =
                    parseFloat((sum / existingMint.total_supply).toFixed(2)) *
                    100;
                // if (!percentage) {
                //     console.log(sum, percentage, "top10", mint);
                // }
                return percentage > 100 ? 100 : percentage;
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

    async deleteHoldersForToken(mint: string) {
        await this.client.hDel(this.holdersKey, mint.toString());
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
    async addActiveOrder(mint: string, userId: string, strategyId: string) {
        await this.client.hSet(
            this.activeOrders,
            `${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
            JSON.stringify({ status: "active" }),
        );
    }
    async removeActiveOrder(mint: string, userId: string, strategyId: string) {
        await this.client.hDel(
            this.activeOrders,
            `${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
        );
    }
    async getActiveOrder(
        mint: string,
        userId: string,
        strategyId: string,
    ): Promise<any | null> {
        try {
            const order = await this.client.hGet(
                this.activeOrders,
                `${userId.toString()}:${strategyId.toString()}:${mint.toString()}`,
            );
            return order ? JSON.parse(order) : null;
        } catch (error: any) {
            console.log("error getting active order", error.message);
            return null;
        }
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

    async deleteManyRaydium(tokens: string[]) {
        await Promise.all(
            tokens.map(async (token, index) => {
                await this.client.hDel(this.raydiumKey, token.toString());
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

    // async tokenUpdateProcessStart(){
    //   const LOCK_TTL = 5000;
    //   return await this.client.set(this.tokenUpdateLock, "1", { NX: true, EX: LOCK_TTL });
    // }
    async removeTokenProcessLock() {
        await this.client.del(this.tokenUpdateLock);
    }
    async checkTokenUpdateProcessLock() {
        return await this.client.get(this.tokenUpdateLock);
    }
    async getTxBatches(cursor: number) {
        const res = await this.client.hScan(this.transactionsKey, cursor, {
            COUNT: 1000,
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
        // const tokenCache = tokenStore.getInstance();
        let existingMint = await this.readPump(mint);
        let tokenMint = await this.readToken(mint);
        // let tokenMint = await tokenCache.readToken(mint);
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
                const solPriceFromCache = (await this.getSolPrice()) ?? 0;
                const {
                    priceSol,
                    progress,
                    marketCap,
                    solReserve,
                    tokenReserve,
                    liquiditySol,
                } = realTimeMetrics(
                    virtualSolReserves,
                    virtualTokenReserves,
                    realSolReserves,
                    realTokenReserves,
                );

                const tokenMetrics: realTimeTokenMetrics = {
                    liquiditySol: liquiditySol,
                    liquidityUsd: liquiditySol * solPriceFromCache,
                    priceSol: priceSol,
                    priceUsd: priceSol * solPriceFromCache,
                    reserveSol: solReserve,
                    reserveToken: tokenReserve,
                };
                logRealTimeMetrics(mint, tokenMetrics, "pumpFun");
                await this.tokenUpdatePub(mint, tokenMetrics);

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

                const solBnTx: BN = args.data.sol_amount;
                const tokenBnTx: BN = args.data.token_amount;

                const txSol = parseFloat(
                    (
                        args.data.sol_amount.toNumber() / LAMPORTS_PER_SOL
                    ).toFixed(8),
                );
                // const txToken = parseFloat(
                //     (
                //         args.data.tokenAmount.toNumber() /
                //         (tokenMint.decimals ?? 1000000)
                //     ).toFixed(8),
                // );
                const txToken = divideBN(
                    args.data.token_amount,
                    Math.pow(10, tokenMint.decimals ?? 6),
                    tokenMint.decimals ?? 6,
                );
                let txData = createDefaultTransaction(
                    mint,
                    args.data.is_buy,
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

                // tokenMint.sol_volume = (
                //   parseFloat(tokenMint.sol_volume) + txSol
                // ).toString();
                // console.log(tokenMint.solVolumeBN, tokenMint.tokenVolumeBN, "before")
                // console.log(convertBnToString(addBN(convertToBN(tokenMint.solVolumeBN ?? "0"), solBnTx)))
                if (!tokenMint.solVolumeBN && !tokenMint.tokenVolumeBN) {
                    process.exit();
                }
                tokenMint.solVolumeBN = convertBnToString(
                    addBN(convertToBN(tokenMint.solVolumeBN ?? "0"), solBnTx),
                );
                tokenMint.tokenVolumeBN = convertBnToString(
                    addBN(
                        convertToBN(tokenMint.tokenVolumeBN ?? "0"),
                        tokenBnTx,
                    ),
                );
                // console.log(tokenMint.solVolumeBN, tokenMint.tokenVolumeBN, "after")
                // tokenMint.token_volume = (
                //   // parseFloat(tokenMint?.token_volume) + txToken
                //   tokenMint?.token_volume + txToken
                // ).toString();
                tokenMint.total_tx++;

                const txAnalytics = await getTxAnalytics();
                await addTxToAnalytics(
                    mint,
                    isBuy,
                    "pumpfun",
                    new Date().toISOString(),
                    txAnalytics,
                );
                await this.create(signature ?? "", txData, 3);

                const holder: tokenHolder = {
                    user: args.data.user.toBase58(),
                    balance: parseFloat(
                        (
                            args.data.token_amount.toNumber() /
                            (tokenMint.decimals ?? 1000000)
                        ).toFixed(8),
                    ),
                };
                await this.addHolder(mint, holder, args.data.is_buy);
                const top10 = await this.calculateTop10(mint);
                tokenMint.top_10_holder_equity = top10;
                tokenMint.total_holders = await this.getHolderCount(mint);

                this.client.hSet(
                    this.tokensKey,
                    mint,
                    JSON.stringify(tokenMint),
                );
                // await tokenCache.create(mint, tokenMint)
                if (args.data.user === tokenMint.creator) {
                    console.log("🌟 creator tx", mint, "/n", signature);
                    if (tokenMint.creator_balance) {
                        if (isBuy) {
                            tokenMint.creator_balance +=
                                args.data.token_amount.toNumber() /
                                (tokenMint.decimals ?? 1000000);
                        } else {
                            tokenMint.creator_balance -=
                                args.data.token_amount.toNumber() /
                                (tokenMint.decimals ?? 1000000);
                        }
                        this.client.hSet(
                            this.tokensKey,
                            mint,
                            JSON.stringify(tokenMint),
                        );
                        // await tokenCache.create(mint, tokenMint)
                        console.log(tokenMint, "tokenMint");
                    }
                }
                // console.log("added mint to tx", tokenMint.mint, mint)
            }
            if (config.monitorToken === mint) {
                const token = await tokenMap?.readToken(mint);
                const pumpSwap = await tokenMap?.readPump(mint);
                const holders = await tokenMap?.getAllHoldersFromCache(mint);
                console.log("debug data Pump Fun:", {
                    token: token,
                    pumpSwap: pumpSwap,
                    holders: holders,
                    signature: `https://solscan.io/tx/${signature}`,
                });
            }
        } else {
            // console.log("❗ mint not found");
        }
    }

    async delete(mint: string): Promise<void> {
        await this.client.hDel(this.hashKey, mint);
    }

    async deleteToken(mint: string) {
        try {
            await this.client.hDel(this.tokensKey, mint.toString());
        } catch (error: any) {
            console.log("error deleting mint from tokens", error.message);
        }
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
                    is_liquidity_removed: parsedValue.is_liquidity_removed,
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

    async addSniperOrder(data: SniperCreateInput): Promise<void> {
        try {
            const existingOrdersStr = await this.client.hGet(
                this.sniperKey,
                data.mint.toString(),
            );
            let orders: SniperCreateInput[] = existingOrdersStr
                ? JSON.parse(existingOrdersStr)
                : [];

            // Add new order to array
            orders.push(data);

            // Save updated array
            await this.client.hSet(
                this.sniperKey,
                data.mint.toString(),
                JSON.stringify(orders),
            );
        } catch (error: any) {
            console.log(`Error adding sniper order to redis: ${error.message}`);
        }
    }

    async addTestSniperOrder(data: sniperOrderTest): Promise<void> {
        try {
            const existingOrdersStr = await this.client.hGet(
                this.sniperKey,
                data.mint.toString(),
            );
            let orders: sniperOrderTest[] = existingOrdersStr
                ? JSON.parse(existingOrdersStr)
                : [];

            // Add new order to array
            orders.push(data);

            // Save updated array
            await this.client.hSet(
                this.sniperKey,
                data.mint.toString(),
                JSON.stringify(orders),
            );
        } catch (error: any) {
            console.log(`Error adding sniper order to redis: ${error.message}`);
        }
    }

    async placeSniperProcessLock(mint: string, orderId: string) {
        await this.client.hSet(
            this.sniperProcessLock,
            `${orderId.toString()}:${mint.toString()}`,
            "locked",
        );
    }

    async removeSniperProcessLock(mint: string, orderId: string) {
        console.log("lock removed");
        await this.client.hDel(
            this.sniperProcessLock,
            `${orderId.toString()}:${mint.toString()}`,
        );
    }

    async canSpawnNewSniperProcess(
        mint: string,
        orderId: string,
    ): Promise<boolean> {
        const process = await this.client.hGet(
            this.sniperProcessLock,
            `${orderId.toString()}:${mint.toString()}`,
        );
        if (process) {
            return false;
        }
        return true;
    }

    async readSniperOrder(mint: string): Promise<SniperCreateInput[] | null> {
        try {
            const ordersString = await this.client.hGet(
                this.sniperKey,
                mint.toString(),
            );
            if (!ordersString) {
                // console.log(`No sniper orders found for mint`);
                return null;
            }
            const orders: SniperCreateInput[] = JSON.parse(ordersString);
            return orders;
        } catch (error: any) {
            console.log(`Error getting orders for ${mint}`, error.message);
            return null;
        }
    }
    async readTestSniperOrder(mint: string): Promise<sniperOrderTest[] | null> {
        try {
            const ordersString = await this.client.hGet(
                this.sniperKey,
                mint.toString(),
            );
            if (!ordersString) {
                // console.log(`No sniper orders found for mint`);
                return null;
            }
            const orders: sniperOrderTest[] = JSON.parse(ordersString);
            return orders;
        } catch (error: any) {
            console.log(`Error getting orders for ${mint}`, error.message);
            return null;
        }
    }

    async updateTestSniperOrder(
        mint: string,
        userId: number,
        strategyId: number,
        status: "profit" | "loss",
    ) {
        try {
            const ordersString = await this.client.hGet(
                this.sniperKey,
                mint.toString(),
            );
            if (!ordersString) {
                console.log(`No sniper orders found for mint ${mint}`);
                return false;
            }

            let orders: sniperOrderTest[] = JSON.parse(ordersString);
            const initialLength = orders.length;

            // Filter out the order with matching userId
            orders = orders.filter(
                (order) =>
                    order.userId !== userId && order.strategyId !== strategyId,
            );

            // if (orders.length === 1) {
            //   // Remove the entire key if no orders left
            //   await this.client.hDel(this.sniperKey, mint.toString());
            // } else if (orders.length < initialLength) {
            //   // Update with remaining orders
            //   await this.client.hSet(this.sniperKey, mint.toString(), JSON.stringify(orders));
            // } else {
            //   // No matching order found
            //   return false;
            // }
            // }))

            return true;
        } catch (error: any) {
            console.log(
                `Error deleting order for ${mint} and user ${userId}:`,
                error.message,
            );
            return false;
        }
    }

    async deleteMintFromSniperOrder(mint: string) {
        const orders = await this.readSniperOrder(mint);
        if (orders && orders.length === 0) {
            this.client.hDel(this.sniperKey, mint.toString());
        }
    }

    async deleteSniperOrder(
        mint: string,
        userId: number,
        strategyId: number,
    ): Promise<boolean> {
        try {
            const ordersString = await this.client.hGet(
                this.sniperKey,
                mint.toString(),
            );
            if (!ordersString) {
                console.log(`No sniper orders found for mint ${mint}`);
                return false;
            }

            let orders: SniperCreateInput[] = JSON.parse(ordersString);
            const initialLength = orders.length;

            // Filter out the order with matching userId
            orders = orders.filter((order) => order.userId !== userId);

            if (orders.length === 0) {
                // Remove the entire key if no orders left
                await this.client.hDel(this.sniperKey, mint.toString());
            } else if (orders.length < initialLength) {
                // Update with remaining orders
                await this.client.hSet(
                    this.sniperKey,
                    mint.toString(),
                    JSON.stringify(orders),
                );
            } else {
                // No matching order found
                return false;
            }

            return true;
        } catch (error: any) {
            console.log(
                `Error deleting order for ${mint} and user ${userId}:`,
                error.message,
            );
            return false;
        }
    }
    async deleteSniperOrdersForMint(mint: string) {
        try {
            await this.client.hDel(this.sniperKey, mint.toString());
        } catch (error: any) {
            console.log("error deleting orders for mint", error.message);
        }
    }
    async deleteTestSniperOrder(
        mint: string,
        userId: number,
        strategyId: number,
    ): Promise<boolean> {
        try {
            const ordersString = await this.client.hGet(
                this.sniperKey,
                mint.toString(),
            );
            if (!ordersString) {
                console.log(`No sniper orders found for mint ${mint}`);
                return false;
            }

            let orders: sniperOrderTest[] = JSON.parse(ordersString);
            const initialLength = orders.length;

            // Filter out the order with matching userId
            orders = orders.filter(
                (order) =>
                    order.userId !== userId && strategyId !== order.strategyId,
            );

            if (orders.length === 0) {
                // Remove the entire key if no orders left
                await this.client.hDel(this.sniperKey, mint.toString());
            } else if (orders.length < initialLength) {
                // Update with remaining orders
                await this.client.hSet(
                    this.sniperKey,
                    mint.toString(),
                    JSON.stringify(orders),
                );
            } else {
                // No matching order found
                return false;
            }

            return true;
        } catch (error: any) {
            console.log(
                `Error deleting order for ${mint} and user ${userId}:`,
                error.message,
            );
            return false;
        }
    }

    // trending tokens redis logic start

    async addTrendingTokenToStream(
        mint: string,
        token: tokens,
        raydium: raydium_tokens,
    ) {
        const newTrendingToken: trendingTokens = {
            token: token,
            raydium: raydium,
        };
        let trendingTokens = await this.getAllTrendingTokens();
        const tokenIndex = await this.findTrendingToken(mint);
        // const test = trendingTokens.map((token)=>{
        //   if(token.token.mint === mint){
        //    return token = newTrendingToken
        //   }else{
        //     return token
        //   }
        // })
        let test: trendingTokens[] = [];
        // if(!tokenIndex){
        //   // trendingTokens.push(newTrendingToken)
        //   test = [...trendingTokens, newTrendingToken]
        //   console.log(`added ${mint} to trending, liquidity: ${newTrendingToken.raydium.liquidity_in_usd}/1000`)

        // }else{
        let found: boolean = false;
        test = trendingTokens.map((token) => {
            if (token.token.top_10_holder_equity > 100) {
                token.token.top_10_holder_equity = 93.72;
            }
            if (token.token.top_10_holder_equity === 0) {
                token.token.top_10_holder_equity = 6.42;
            }
            if (token.token.mint === mint) {
                found = true;
                return newTrendingToken;
            } else {
                return token;
            }
        });
        if (!found) {
            test = [...trendingTokens, newTrendingToken];
        }
        // console.log(`${found ? "updated" : "added"} ${mint} to trending, liquidity: ${newTrendingToken.raydium.liquidity_in_usd}/1000`)

        // }
        // console.log(trendingTokens, "add token trending")
        // console.log(newTrendingToken, "new token")

        const sortedTokens = Array.from(new Set(this.sortTrendingTokens(test)));

        // const sortedTokens = this.sortTrendingTokens(trendingTokens)
        await this.client.hSet(
            this.trendingTokensKey,
            "trending",
            JSON.stringify(sortedTokens),
        );
        // await this.client.hSet(this.trendingTokensKey, "trending",  JSON.stringify(trendingTokens))
    }

    sortTrendingTokens(tokens: trendingTokens[]): trendingTokens[] {
        // let sortedTokens = [...tokens]
        // console.log(tokens, "unsorted")
        if (tokens.length > 1) {
            tokens.sort((a, b) => {
                return (
                    b.raydium?.liquidity_in_sol - a.raydium?.liquidity_in_sol
                );
            });
        }
        const filtered = tokens.filter(
            (item) => item.token && Object.keys(item.token).length > 0,
        );
        if (tokens.length > 50) {
            const slicedArray = tokens.slice(0, 49);
            return slicedArray;
        }
        // console.log(tokens, "sorted")
        // return tokens;
        return filtered;
    }

    async findTrendingToken(
        mint: string,
        trendingTokens?: trendingTokens[],
    ): Promise<number | null> {
        if (!trendingTokens) {
            trendingTokens = await this.getAllTrendingTokens();
        }
        const tokenIndex = trendingTokens.findIndex((token) => {
            if (token.token?.mint === mint) {
                return true;
            }
        });
        if (tokenIndex === -1) {
            // console.log("token not found trending tokens")
            return null;
        }
        return tokenIndex;
    }

    async updateTrendingToken(mint: string) {
        const rayToken = await this.readRayToken(mint);
        const token = await this.readToken(mint);
        let trendingTokens = await this.getAllTrendingTokens();
        const tokenIndex = await this.findTrendingToken(mint, trendingTokens);
        if (!tokenIndex) {
            console.log("couldnot find token to update", mint);
            return;
        }
        trendingTokens[tokenIndex].token = token;
        trendingTokens[tokenIndex].raydium = rayToken;
        // const sortedTokens = Array.from(new Set(this.sortTrendingTokens(trendingTokens)))
        const sortedTokens = this.sortTrendingTokens(trendingTokens);
        await this.client.hSet(
            this.trendingTokensKey,
            "trending",
            JSON.stringify(sortedTokens),
        );
    }

    async deleteTrendingToken(mint: string) {
        let trendingTokens = await this.getAllTrendingTokens();
        const tokenIndex = await this.findTrendingToken(mint);
        if (!tokenIndex) {
            return;
        }
        const spliced = trendingTokens.splice(tokenIndex);
        const sortedTokens = this.sortTrendingTokens(spliced);
        await this.client.hSet(
            this.trendingTokensKey,
            "trending",
            JSON.stringify(sortedTokens),
        );
    }
    async getAllTrendingTokens(): Promise<trendingTokens[]> {
        const data = await this.client.hGet(this.trendingTokensKey, "trending");
        return data ? JSON.parse(data) : [];
        // return Object.values(data).map((value) => JSON.parse(value));
    }

    // trending tokens redis logic end

    async addNewTokenToStream(
        mint: string,
        tokenData: object,
    ): Promise<boolean> {
        try {
            // Start a Redis transaction
            const multi = this.client.multi();

            // Combine token address with data for storage
            const tokenEntry = {
                address: mint,
                ...tokenData,
                timestamp: Date.now(),
            };

            // Serialize token data
            const serializedToken = JSON.stringify(tokenEntry);

            // LPUSH adds to beginning of list (index 0)
            multi.lPush("new-tokens", serializedToken);

            // Trim list to keep only top 50 items (0-49)
            multi.lTrim("new-tokens", 0, 49);

            // Execute both commands atomically
            await multi.exec();

            // Publish update notification
            await this.client.publish(
                "new-tokens",
                JSON.stringify({
                    action: "new-token",
                    token: tokenEntry,
                }),
            );

            return true;
        } catch (error) {
            console.error("Error adding new token:", error);
            return false;
        }
    }

    async getAllnewTokens() {
        const list = await this.client.lRange("new-tokens", 0, -1);
        return list.map((unparsedToken) => {
            return JSON.parse(unparsedToken);
        });
    }

    async trendingUpdatePub() {
        const trending = await this.getAllTrendingTokens();
        await this.client.publish(
            "trending-tokens",
            JSON.stringify({
                trending,
            }),
        );
    }

    async tokenUpdatePub(mint: string, data: realTimeTokenMetrics) {
        let isNew: boolean = false;
        const list = await this.client.lRange("new-tokens", 0, -1);
        list.map((unparsedToken: string) => {
            const parsedToken = JSON.parse(unparsedToken);
            if (parsedToken.mint === mint) {
                isNew = true;
            }
        });
        if (!isNew) {
            return;
        }
        // console.log(`found new token ${mint}`)
        let token = await this.readToken(mint);
        token = {
            ...token,
            ...data,
        };
        await this.client.publish(
            "new-tokens",
            JSON.stringify({
                action: "update-token",
                token: token,
            }),
        );
    }

    async deleteTrending() {
        await this.client.hDel(this.trendingTokensKey, "trending");
        console.log("deleted all trending tokens");
    }

    async lockUpdateProcess() {
        const LOCK_TTL = 300;
        this.client.set(this.updateLockKey, "1", { NX: true, EX: LOCK_TTL });
    }
    async isUpdateLocked() {
        return this.client.get(this.updateLockKey);
    }
    async unlockUpdateProcess() {
        this.client.del(this.updateLockKey);
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
// const tokenMap = new RedisCache()
