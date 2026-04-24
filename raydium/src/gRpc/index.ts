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
import { RedisCache } from "../redis/store";
import { decodeRaydium } from "../swapstream/decodeRaydium";
import { Program } from "@coral-xyz/anchor";
import { TransactionFormatter } from "../utils/generalDecoder";
import { RawProducer } from "../Kafka/producer";
import { TokenBuyAnalyzer } from "../bundleChecker/bundleCheck";
import { config } from "../config";
import { processMigratedToken } from "../sniper/processToken";
import { RaydiumAmmParser } from "../swapstream/rayParser";
import { BloXRouteWrapper } from "../bloxroute";
import getSniperStore, { SniperStore } from "../redis/sniperStore";
require("dotenv").config();
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
const bundleChecker = new TokenBuyAnalyzer(config.connection);
const bloxRoute = new BloXRouteWrapper(process.env.AUTH_HEADER ?? "");
const RAYDIUM_PARSER = new RaydiumAmmParser();

async function handleStream(client: Client, args: SubscribeRequest) {
  // connect to the cache
  // const sniperCache = new SniperStore()
  // await sniperCache.connect()
  const sniperCache = await getSniperStore();

  //update sol Price

  // Subscribe for events
  const stream = await client.subscribe();

  // Create `error` / `end` handler
  const streamClosed = new Promise<void>((resolve, reject) => {
    stream.on("error", (error: any) => {
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
  });
  // PLAINTEXT://broker:9092,PLAINTEXT_HOST://localhost:29092
  //   const producer = new RawProducer(
  //   ['kafka.bittics.com:29092'],
  //   '1',
  //   stream
  // );
  // await producer.connect();
  // Handle updates
  stream.on("data", async (data: any) => {
    // console.log(data?.transaction?.transaction?.meta?.logMessages, "")
    // console.log("data from blockchain...");
    // console.log(data);
    if (data?.transaction) {
      // console.log(data?.transaction)
    }
    const logs = data?.transaction?.transaction?.meta?.logMessages;
    // console.log(logs)
    // if (
    //   logs?.some((log: any) =>
    //     log.includes("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
    //   )
    // ) {
    //   decodeData(data, tokenMap);
    // } else
    // if(
    //   logs?.some((log: any) =>
    //     log.includes("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5")
    //   )
    // ){
    //   // console.log(data?.transaction)

    // }
    //   else {
    //   decodeRaydium(data, tokenMap);
    // }
    if (data.filters[0] === "migration") {
      // console.log(data)
      const res = await processMigratedToken(
        data,
        bundleChecker,
        RAYDIUM_PARSER,
        bloxRoute,
        sniperCache,
        false
      );
      res.shouldSnipe
        ? console.log(`should snipe ${res.mint}`)
        : console.log(`should not snipe ${res.mint}`);
    }
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
  undefined
);

const req: SubscribeRequest = {
  accounts: {},
  slots: {
    incoming_slots: {},
  },
  transactions: {
    migration: {
      vote: false,
      failed: false,
      signature: undefined,
      accountInclude: [
        // "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", //pumpfun
        "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5",
        // "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", //raydium
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
