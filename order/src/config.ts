import { Connection, PublicKey } from "@solana/web3.js";
const RPC_ENDPOINT =
    "https://solana-mainnet.core.chainstack.com/871281aaa7d43baf57e912693d3a1ab6";
const connection = new Connection(RPC_ENDPOINT, "confirmed");
const solMint = new PublicKey("So11111111111111111111111111111111111111112");

export const config = {
    connection: connection,
    solMint: solMint,
};
