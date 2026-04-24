// import Client, {
//   CommitmentLevel,
//   SubscribeRequest,
//   SubscribeUpdate,
//   SubscribeUpdateTransaction,
// } from "@triton-one/yellowstone-grpc";
// import {
//   Message,
//   CompiledInstruction,
// } from "@triton-one/yellowstone-grpc/dist/grpc/solana-storage";
// import { ClientDuplexStream } from "@grpc/grpc-js";
// import { PublicKey } from "@solana/web3.js";
// import bs58 from "bs58";
// import { ENDPOINT } from "./constants";
// import { config } from "../config";

// interface FormattedTransactionData {
//   signature: string;
//   slot: string;
//   [accountName: string]: string;
// }

// // Main function
// export async function geyserMain(): Promise<void> {
//   const client = new Client(config.rpcEndpoint, TOKEN, {});
//   const stream = await client.subscribe();
//   const request = createSubscribeRequest();

//   try {
//     await sendSubscribeRequest(stream, request);
//     console.log(
//       "Geyser connection established - watching new Pump.fun mints. \n"
//     );
//     await handleStreamEvents(stream);
//   } catch (error) {
//     console.error("Error in subscription process:", error);
//     stream.end();
//   }
// }
