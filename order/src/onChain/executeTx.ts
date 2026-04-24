import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { VersionedTransaction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { config } from "../config";
import orderLogger from "../orderLogger";

export const executeTx = async (
    swapTx: string,
    privateKey: string,
    confirm: boolean,
    blockHash?: any,
    signedTx?: any,
): Promise<string | null> => {
    console.log(signedTx?.recentBlockHash, "signedTx");
    let serializedTx: any;
    if (!signedTx) {
        const privateKeyArray = bs58.decode(privateKey);
        const wallet = Keypair.fromSecretKey(privateKeyArray);
        const transaction = VersionedTransaction.deserialize(
            Buffer.from(swapTx, "base64"),
        );
        transaction.sign([wallet]);
        serializedTx = transaction.serialize();
    } else {
        console.log("signedTx");
        serializedTx = signedTx.serialize();
    }
    try {
        console.log("sending tx");
        orderLogger.debug("sending tx");
        const tx = await config.connection.sendRawTransaction(serializedTx, {
            skipPreflight: false,
            maxRetries: 2,
        });
        const latestBlockHash =
            await config.connection.getLatestBlockhash("processed");
        console.log(latestBlockHash, "in execution");
        if (!confirm) {
            console.log("unconfirmed", `https://solscan.io/tx/${tx}`);
            return tx;
        }
        console.log("confirming tx", tx);
        let confirmation: any;
        try {
            confirmation = await config.connection.confirmTransaction(
                {
                    // blockhash: latestBlockHash.blockhash,
                    blockhash: blockHash.blockhash,
                    // lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                    lastValidBlockHeight: blockHash.lastValidBlockHeight,
                    signature: tx,
                },
                "processed",
            );
        } catch (error: any) {
            console.log(error.message);
        }
        console.log(confirmation, "confirmation");
        if (confirmation.value.err) {
            throw new Error(
                `Transaction failed: ${JSON.stringify(
                    confirmation.value.err,
                )}\nhttps://solscan.io/tx/${tx}/`,
            );
        } else
            console.log(
                `Transaction successful: https://solscan.io/tx/${tx}/`,
                new Date().toISOString(),
            );
        orderLogger.info(
            `Transaction successful: https://solscan.io/tx/${tx}`,
            new Date().toISOString(),
        );
        console.log(`transaction successful https://solscan.io/tx/${tx}`);
        // orderLogger.info(`transaction successful https://solscan.io/tx/${tx}`)
        return tx;
    } catch (error: any) {
        console.log("error sending transaction", error.message);
        orderLogger.error("error sending transaction", error.message);
        return null;
    }
};
