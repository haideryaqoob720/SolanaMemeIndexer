// import "dotenv/config";
// import Client, {
//   CommitmentLevel,
//   SubscribeRequestAccountsDataSlice,
//   SubscribeRequestFilterAccounts,
//   SubscribeRequestFilterBlocks,
//   SubscribeRequestFilterBlocksMeta,
//   SubscribeRequestFilterEntry,
//   SubscribeRequestFilterSlots,
//   SubscribeRequestFilterTransactions,
// } from "@triton-one/yellowstone-grpc";
// import { SubscribeRequestPing } from "@triton-one/yellowstone-grpc/dist/types/grpc/geyser";
// import { decodeData } from "../swapstream/decodeData";
// import { RedisCache } from "../redis/store";
// // import { SubscribeRequestPing } from "@triton-one/yellowstone-grpc/dist/grpc/geyser";

// interface SubscribeRequest {
//   accounts: { [key: string]: SubscribeRequestFilterAccounts };
//   slots: { [key: string]: SubscribeRequestFilterSlots };
//   transactions: { [key: string]: SubscribeRequestFilterTransactions };
//   transactionsStatus: { [key: string]: SubscribeRequestFilterTransactions };
//   blocks: { [key: string]: SubscribeRequestFilterBlocks };
//   blocksMeta: { [key: string]: SubscribeRequestFilterBlocksMeta };
//   entry: { [key: string]: SubscribeRequestFilterEntry };
//   commitment?: CommitmentLevel | undefined;
//   accountsDataSlice: SubscribeRequestAccountsDataSlice[];
//   ping?: SubscribeRequestPing | undefined;
// }

// async function handleStream(client: Client, args: SubscribeRequest) {
//   // connect to the cache
//   const tokenMap = new RedisCache();
//   await tokenMap.connect();

//   // Subscribe for events
//   const stream = await client.subscribe();

//   // Create `error` / `end` handler
//   const streamClosed = new Promise<void>((resolve, reject) => {
//     stream.on("error", (error) => {
//       console.log("gRPC ERROR", error);
//       reject(error);
//       stream.end();
//     });
//     stream.on("end", () => {
//       resolve();
//     });
//     stream.on("close", () => {
//       resolve();
//     });
//   });

//   // Handle updates
//   stream.on("data", async (data) => {
//     decodeData(data?.transaction?.transaction?.meta?.logMessages, tokenMap);
//   });

//   // Send subscribe request
//   await new Promise<void>((resolve, reject) => {
//     stream.write(args, (err: any) => {
//       if (err === null || err === undefined) {
//         resolve();
//       } else {
//         reject(err);
//       }
//     });
//   }).catch((reason) => {
//     console.error(reason);
//     throw reason;
//   });

//   await streamClosed;
// }

// async function subscribeCommand(client: Client, args: SubscribeRequest) {
//   while (true) {
//     try {
//       await handleStream(client, args);
//     } catch (error) {
//       console.error("Stream error, restarting in 1 second...", error);
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//     }
//   }
// }

// const client = new Client(
//   process.env.ENDPOINT ?? "",
//   process.env.X_TOKEN ?? "",
//   undefined
// );

// const req: SubscribeRequest = {
//   accounts: {},
//   slots: {
//     incoming_slots: {},
//   },
//   transactions: {
//     pumpFun: {
//       vote: false,
//       failed: false,
//       signature: undefined,
//       accountInclude: ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"],
//       accountExclude: [],
//       accountRequired: [],
//     },
//   },
//   transactionsStatus: {},
//   entry: {},
//   blocks: {},
//   blocksMeta: {},
//   accountsDataSlice: [],
//   ping: undefined,
//   commitment: CommitmentLevel.CONFIRMED,
// }; // Subscribe to slots

// export function startGrpc() {
//   subscribeCommand(client, req);
// }
