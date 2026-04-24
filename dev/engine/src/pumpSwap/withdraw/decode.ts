import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { divideBN, subtractBN } from "./utils";
import { pumpSwapWithdrawDecode } from "../../types";
import { logWithdraw } from "../../utils/withdrawLogger";

function decodeWithdrawEvent(
    args: any,
    solPrice: number,
    decimals: number,
    isQuote: boolean,
    mint: string,
    signature: string,
): pumpSwapWithdrawDecode | null {
    try {
        let txSol: any, txToken: any;
        txToken = isQuote
            ? args.data.base_amount_out
            : args.data.quote_amount_out;
        txSol = isQuote
            ? args.data.quote_amount_out
            : args.data.base_amount_out;
        let solInTx = divideBN(txSol, LAMPORTS_PER_SOL, 9, "solInTx");
        let tokenInTx = divideBN(
            txToken,
            Math.pow(10, decimals),
            decimals,
            "tokenInTx",
        );
        let solReserveBN = isQuote
            ? args.data.pool_quote_token_reserves
            : args.data.pool_base_token_reserves;
        let solReserve = divideBN(
            isQuote
                ? args.data.pool_quote_token_reserves
                : args.data.pool_base_token_reserves,
            LAMPORTS_PER_SOL,
            9,
            "solReserve",
        );
        let tokenReserveBN = isQuote
            ? args.data.pool_base_token_reserves
            : args.data.pool_quote_token_reserves;
        let tokenReserve = divideBN(
            isQuote
                ? args.data.pool_base_token_reserves
                : args.data.pool_quote_token_reserves,
            Math.pow(10, decimals),
            decimals,
            "tokenReserve",
        );
        // const updatedsolReserve = solReserve - solInTx;
        const updatedsolReserve = subtractBN(txSol, solReserveBN, 9);
        // const updatedtokenReserve = tokenReserve - tokenInTx;
        const updatedtokenReserve = subtractBN(
            txToken,
            tokenReserveBN,
            decimals,
        );
        const priceInSol: number = updatedsolReserve / updatedtokenReserve;
        const priceInUsd: number = priceInSol * solPrice;
        // const liquidityInSol: number = solReserve + tokenReserve * priceInSol;
        const liquidityInSol: number =
            updatedsolReserve + updatedtokenReserve * priceInSol;
        const liquidityInUsd: number =
            updatedsolReserve * solPrice +
            updatedtokenReserve * priceInSol * solPrice;
        const data: pumpSwapWithdrawDecode = {
            mint: mint,
            holder: args.data.user.toBase58(),
            solInTx: solInTx,
            tokenInTx: tokenInTx,
            solReserve: solReserve,
            tokenReserve: tokenReserve,
            priceInSol: priceInSol,
            priceInUsd: priceInUsd,
            liquidityInSol: liquidityInSol,
            liquidityInUsd: liquidityInUsd,
            timestamp: args.data.timestamp.toNumber(),
            txTokenBn: txToken,
            signature: signature,
        };
        logWithdraw("withdrawEvent", {
            withdraw: data,
            updatedsolReserve: updatedsolReserve,
            updatedtokenReserve: updatedtokenReserve,
            link: `https:solscan.io/tx/${data.signature}`,
        });
        // console.log({
        //     withdraw: data,
        //     updatedsolReserve: updatedsolReserve,
        //     updatedtokenReserve: updatedtokenReserve,
        //     link: `https:solscan.io/tx/${data.signature}`,
        // });
        return data;
    } catch (error: any) {
        console.log("error decoding withdraw event");
        return null;
    }
}

export default decodeWithdrawEvent;
