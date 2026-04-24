import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import type { sniperOrderRedis } from "../../redis/cache.type";
import {
    createBurnCheckedInstruction,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    createCloseAccountInstruction,
} from "@solana/spl-token";
import { getTokenAmount } from "../onChain/sell/sell";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { config } from "../config";
import { executeTx } from "../onChain/executeTx";

export async function closeAccount(order: sniperOrderRedis) {
    const mintKey = new PublicKey(order.mint);
    const signer = new PublicKey(order.keypair.public);
    const tokenBalance = await getTokenAmount(order.mint, order.keypair.public);
    if (!tokenBalance) return null;
    const tokenAta = getAssociatedTokenAddressSync(mintKey, signer);
    const burnIx = createBurnCheckedInstruction(
        tokenAta,
        mintKey,
        signer,
        tokenBalance,
        order.decimals,
    );
    const closeAccountIx = createCloseAccountInstruction(
        tokenAta,
        signer,
        signer,
    );
    const blockHash = await config.connection.getLatestBlockhash("processed");
    const newTx = new Transaction(blockHash);
    newTx.add(burnIx, closeAccountIx);
    const privateKeyArray = bs58.decode(order.keypair.private);
    const wallet = Keypair.fromSecretKey(privateKeyArray);
    newTx.feePayer = wallet.publicKey;
    newTx.sign(wallet);
    const serialized = newTx.serialize();
    const closeTx = serialized.toString("base64");
    const tx = await executeTx(
        closeTx,
        order.keypair.private,
        false,
        blockHash,
        newTx,
    );
    console.log("closedAccount", `https://solscan.io.tx/${tx}`);
}

export async function closeAccountTest(
    mint: string,
    wallet: {
        public: string;
        private: string;
    },
    decimals: number,
) {
    // console.log(wallet, "wallet");
    const mintKey = new PublicKey(mint);
    const signer = new PublicKey(wallet.public);
    const tokenBalance = await getTokenAmount(mint, wallet.public);
    if (!tokenBalance) {
        console.log("no balance");
        return null;
    }
    const tokenAta = getAssociatedTokenAddressSync(mintKey, signer);
    const burnIx = createBurnCheckedInstruction(
        tokenAta,
        mintKey,
        signer,
        tokenBalance,
        decimals,
    );
    const closeAccountIx = createCloseAccountInstruction(
        tokenAta,
        signer,
        signer,
    );
    const blockHash = await config.connection.getLatestBlockhash("processed");
    const newTx = new Transaction(blockHash);
    newTx.add(burnIx, closeAccountIx);
    const privateKeyArray = bs58.decode(wallet.private);
    const walletPair = Keypair.fromSecretKey(privateKeyArray);
    newTx.feePayer = walletPair.publicKey;
    newTx.sign(walletPair);
    const serialized = newTx.serialize();
    const closeTx = serialized.toString("base64");
    const tx = await executeTx(
        closeTx,
        wallet.private,
        false,
        blockHash,
        newTx,
    );
    console.log("closedAccount", `https://solscan.io/tx/${tx}`);
}
