import { VersionedTransactionResponse } from "@solana/web3.js";
import { TransactionFormatter } from "../../utils/generalDecoder";
import { config } from "../../config";

interface basicTxInfo {
    decodedTx: VersionedTransactionResponse;
    mint: string;
    signature: string;
    signer: string;
}
export const getBasicTxInfo = (data: any): basicTxInfo | null => {
    try {
        const decode = new TransactionFormatter();
        const decodedTx = decode.formTransactionFromJson(
            data?.transaction,
            new Date().getTime(),
        );
        let signer: string = "";
        if (decodedTx.transaction.message.version === 0) {
            signer =
                decodedTx.transaction.message.staticAccountKeys[0].toBase58();
        } else {
            signer = decodedTx.transaction.message.accountKeys[0].toBase58();
        }
        const mint: string =
            data?.transaction?.transaction?.meta?.preTokenBalances.find(
                (account: any) => account.mint !== config.solMint.toBase58(),
            )?.mint;
        if (!mint) {
            console.log("❗ mint not found");
            return null;
        }
        const signature: string = decodedTx.transaction.signatures[0];
        return {
            decodedTx,
            mint,
            signature,
            signer,
        };
    } catch (error: any) {
        console.log("error decodeing basic tx info", error.message, error);
        return null;
    }
};
