import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { VersionedTransaction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { config } from "../config";

export const executeTx = async (swapTx:string, privateKey:string):Promise<string | null> => {
    const privateKeyArray = bs58.decode(privateKey)
        const wallet = Keypair.fromSecretKey(privateKeyArray)
        const transaction = VersionedTransaction.deserialize(
          Buffer.from(swapTx, "base64")
        );
        transaction.sign([wallet])
        try {
            const tx = await config.connection.sendRawTransaction(transaction.serialize(),{
                skipPreflight:true,
                maxRetries:2,
            })
            const latestBlockHash = await config.connection.getLatestBlockhash();

    const confirmation = await config.connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature:tx,
      },
      "processed"
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(
          confirmation.value.err
        )}\nhttps://solscan.io/tx/${tx}/`
      );
    } else
      console.log(
        `Transaction successful: https://solscan.io/tx/${tx}/`,
        new Date().toISOString()
      );
            console.log(`transaction successful https://solscan.io/tx/${tx}`)
            return tx
        } catch (error:any) {
            console.log("error sending transaction", error.message)
            return null
        }
}