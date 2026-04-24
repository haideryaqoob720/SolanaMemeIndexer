// import "dotenv/config";
import Client, {
    CommitmentLevel,
    SubscribeRequestAccountsDataSlice,
    SubscribeRequestFilterAccounts,
    SubscribeRequestFilterBlocks,
    SubscribeRequestFilterBlocksMeta,
    SubscribeRequestFilterEntry,
    SubscribeRequestFilterSlots,
    SubscribeRequestFilterTransactions,
} from "@triton-one/yellowstone-grpc";
import { SubscribeRequestPing } from "@triton-one/yellowstone-grpc/dist/types/grpc/geyser";
import { decodeData } from "../swapstream/decodeData";
import getRedisClient, { RedisCache } from "../redis/store";
import { decodeRaydium } from "../swapstream/decodeRaydium";
import { Program } from "@coral-xyz/anchor";
import { TransactionFormatter } from "../utils/generalDecoder";
import { RawProducer } from "../Kafka/producer";
import { RedisStream } from "../redis/stream";
import { BloXRouteWrapper } from "../bloxroute";
import { decodePumpSwap } from "../swapstream/decodePumpSwap";
import { get } from "http";
import getInstructionsFromTx from "./generalDecoder";
import GeneralParser from "./generalDecoder";
// import { SubscribeRequestPing } from "@triton-one/yellowstone-grpc/dist/grpc/geyser";

interface SubscribeRequest {
    accounts: { [key: string]: SubscribeRequestFilterAccounts };
    slots: { [key: string]: SubscribeRequestFilterSlots };
    transactions: { [key: string]: SubscribeRequestFilterTransactions };
    transactionsStatus: { [key: string]: SubscribeRequestFilterTransactions };
    blocks: { [key: string]: SubscribeRequestFilterBlocks };
    blocksMeta: { [key: string]: SubscribeRequestFilterBlocksMeta };
    entry: { [key: string]: SubscribeRequestFilterEntry };
    commitment?: CommitmentLevel | undefined;
    accountsDataSlice: SubscribeRequestAccountsDataSlice[];
    ping?: SubscribeRequestPing | undefined;
}

async function handleStream(client: Client, args: SubscribeRequest) {
    // connect to the cache
    // const tokenMap = new RedisCache();
    // await tokenMap.connect();
    const tokenMap = await getRedisClient();
    const redisStream = new RedisStream({});
    await tokenMap.setTrendingMetrics({
        liquidityUsd: 1000,
    });
    const bloxRoute = new BloXRouteWrapper(process.env.AUTH_HEADER ?? "");

    //update sol Price

    // Subscribe for events
    const stream = await client.subscribe();

    // Create `error` / `end` handler
    const streamClosed = new Promise<void>((resolve, reject) => {
        stream.on("error", (error) => {
            console.log("gRPC ERROR", error);
            reject(error);
            stream.end();
        });
        stream.on("end", () => {
            resolve();
        });
        stream.on("close", () => {
            resolve();
        });
        stream.on("status", (status) => {
            console.log(status);
        });
    });
    const decode = new TransactionFormatter();
    const generalParser = new GeneralParser();
    // Handle updates
    stream.on("data", async (data) => {
        if (!data || !data.transaction) {
            console.log(data);
            return;
        }
        const decodedTx = decode.formTransactionFromJson(
            data?.transaction,
            new Date().getTime(),
        );
        data.filters.forEach((dex: string) => {
            switch (dex) {
                case "pumpFun":
                    decodeData(decodedTx, generalParser, tokenMap);
                    break;
                case "pumpSwap":
                    decodePumpSwap(data, tokenMap);
                    break;
                case "raydium":
                    const raydiumIxs =
                        generalParser.getRaydiumInstructionsFromTx(decodedTx);
                    if (!raydiumIxs) return;
                    // decodeRaydium(data, tokenMap, redisStream, bloxRoute);
                    raydiumIxs.map((ix) => {
                        // const signer = ix.accounts[16];
                        // const market = ix.accounts[7];
                        // console.log(
                        //     signer,
                        //     market,
                        //     "raydium ix",
                        //     `https://solscan.io/tx/${decodedTx.transaction.signatures[0]}`,
                        // );
                        decodeRaydium(
                            data,
                            ix.rayLog,
                            tokenMap,
                            redisStream,
                            bloxRoute,
                        );
                    });
                    break;
                default:
                    // console.log(data, "grpc");
                    console.log(`unknown dex: ${dex}`);
                    break;
            }
        });

        // const logs = data?.transaction?.transaction?.meta?.logMessages;
        // if (
        //     logs?.some((log: any) =>
        //         log.includes("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
        //     )
        // ) {
        //     decodeData(data, tokenMap);
        // } else if (
        //     logs?.some((log: any) =>
        //         log.includes("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"),
        //     )
        // ) {
        //     // decodePumpSwap(data, tokenMap);
        // } else {
        //     // decodeRaydium(data, tokenMap, redisStream, bloxRoute);
        // }
    });

    // Send subscribe request
    await new Promise<void>((resolve, reject) => {
        stream.write(args, (err: any) => {
            if (err === null || err === undefined) {
                resolve();
            } else {
                reject(err);
            }
        });
    }).catch((reason) => {
        console.error(reason);
        throw reason;
    });

    await streamClosed;
}

async function subscribeCommand(client: Client, args: SubscribeRequest) {
    while (true) {
        try {
            await handleStream(client, args);
        } catch (error) {
            console.error("Stream error, restarting in 1 second...", error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

const client = new Client(
    process.env.ENDPOINT ?? "",
    process.env.X_TOKEN ?? "",
    undefined,
);

const req: SubscribeRequest = {
    accounts: {},
    slots: {
        // incoming_slots: {},
    },
    transactions: {
        pumpFun: {
            vote: false,
            failed: false,
            signature: undefined,
            accountInclude: [
                "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", //pumpfun
                // "4XBqViD1XYF1qHrErrsXBzDrCapvP9fEFX4LPjXZi9YU" //user
            ],
            accountExclude: [],
            accountRequired: [],
        },
        pumpSwap: {
            vote: false,
            failed: false,
            signature: undefined,
            accountInclude: [
                "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", //pumpswap
            ],
            accountExclude: [],
            accountRequired: [],
        },
        raydium: {
            vote: false,
            failed: false,
            signature: undefined,
            accountInclude: [
                "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", //raydium
            ],
            accountExclude: [],
            accountRequired: [],
        },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    ping: undefined,
    commitment: CommitmentLevel.CONFIRMED,
}; // Subscribe to slots

export function startGrpc() {
    subscribeCommand(client, req);
}
