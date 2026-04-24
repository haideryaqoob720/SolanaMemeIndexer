import {
    ComputeBudgetProgram,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    Transaction,
} from "@solana/web3.js";
// import { BloXRouteWrapper } from "../../bloxroute";
import { executeTx } from "../executeTx";
import { config } from "../../config";
// import { txEncode } from "@triton-one/yellowstone-grpc";
import { pumpSwapQuote } from "../../sniperSell/sellUtils";
// import { pumpSwapCreateDecode } from "../../types";
// import getPumpSwapStore from "../../redis/pumpswap";

import { RateLimiter } from "limiter";
import { pumpSwapTx } from "../../pumpswap/pumpSwapBuySell";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { calculateSolReceived } from "../../utils/calculateSol";

const limiter = new RateLimiter({ tokensPerInterval: 10, interval: "second" });
async function fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    await limiter.removeTokens(1);
    return await fn();
}
export const sendSellTransaction = async (
    mint: string,
    market: string,
    publicKey: string,
    privateKey: string,
    inAmount: number,
    decimals: number,
    isOnChain: boolean,
    hasBought: boolean,
    dex: "Raydium" | "PumpSwap",
    priceInSol: number,
    isQuote: boolean,
    isWithdraw: boolean,
    retry: number,
): Promise<{ tx: string | null; price: number; outAmount: number } | null> => {
    // const pumpSwapCache = await getPumpSwapStore();
    const authHeader: string = process.env.AUTH_HEADER ?? "";
    // const bloxRoute = new BloXRouteWrapper(authHeader)
    // const inAmountRpc = await getTokenAmount(mint, publicKey);
    // if (!inAmountRpc && isOnChain) {
    //     return null;
    // }
    let tokenAmount = inAmount * Math.pow(10, decimals);
    let tokenUiAmount = inAmount;
    if (isOnChain) {
        const inAmountRpc = await getTokenAmount(mint, publicKey);
        if (inAmountRpc) {
            tokenAmount = inAmountRpc;
            tokenUiAmount = inAmountRpc / Math.pow(10, decimals);
            console.log(
                tokenAmount,
                tokenUiAmount,
                decimals,
                "token amount rpc",
            );
        }
    }
    // (inAmountRpc ?? inAmount) / Math.pow(10, decimals);
    // inAmount / Math.pow(10, decimals);
    //
    if (dex === "Raydium") {
        // const swapRes = await bloxRoute.swapApi(mint, publicKey, privateKey, AmountWithOutDecimals, false)
        // console.log("swapRes", swapRes)
        // if(!swapRes){
        //   return null
        // }
        // const price = swapRes.outAmount/AmountWithOutDecimals
        // if(!isOnChain || !hasBought){
        //   return {
        //     tx: null,
        //     price: price,
        //     outAmount:swapRes.outAmount
        //   }
        // }
        // const tx = await executeTx(swapRes.transaction, privateKey)
        // return {
        //   tx: tx,
        //   price: price,
        //   outAmount:swapRes.outAmount
        // }
        // return null
    } else if (dex === "PumpSwap") {
        // const existingPump = await pumpSwapCache.getToken(mint);
        // if (!existingPump) {
        //     return null;
        // }
        console.log(mint, inAmount, decimals, isOnChain, hasBought, dex);
        const res = await pumpSwapSell(
            // inAmountRpc ?? inAmount,
            tokenAmount,
            tokenUiAmount,
            mint,
            publicKey,
            privateKey,
            market,
            isOnChain,
            hasBought,
            priceInSol,
            isQuote,
            isWithdraw,
            retry,
        );
        // if (isOnChain && !res?.tx) {
        //   console.log(res, "sell.ts 102")
        //     return null;
        // }
        return res;
    }
    return null;
};

export const getTokenAmount = async (
    mintToken: any,
    publicKey: string,
): Promise<number | null> => {
    const wallet = new PublicKey(publicKey);
    const token = new PublicKey(mintToken);
    try {
        const tokenAccounts =
            await config.connection.getParsedTokenAccountsByOwner(wallet, {
                mint: token,
            });
        if (tokenAccounts.value.length === 0) {
            return null;
        }
        if (
            tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount
                .amount === "0"
        ) {
            return null;
        }
        console.log({
            tokenAccounts:
                tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount
                    .amount,
        });
        return tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount
            .amount;
    } catch (error) {
        return null;
    }
};

async function pumpSwapSell(
    tokenAmount: number,
    tokenUiAmount: number,
    mint: string,
    publicKey: string,
    privateKey: string,
    pool: string,
    isOnChain: boolean,
    hasBought: boolean,
    priceInSol: number,
    isQuote: boolean,
    isWithdraw: boolean,
    retry: number,
) {
    // const swapRes = await bloxRoute.swapApi(mint, publicKey, privateKey, tokenAmount, false)
    // const swapRes = await fetchWithRateLimit(async () => {
    //     return await pumpSwapQuote(pool, tokenAmount, false);
    // });
    console.log(tokenAmount, tokenUiAmount, "token Amount sell");
    // const swapSdk = await pumpSwapQuote(pool, tokenAmount, false, isQuote);
    // console.log(swapSdk, "swapSdk");
    const swapRes = {
        amountOut: calculateSolReceived(tokenUiAmount, priceInSol),
    };
    console.log("swapRes", swapRes);
    if (!swapRes) {
        return null;
    }
    const price = swapRes.amountOut / LAMPORTS_PER_SOL / tokenAmount;
    if ((!isOnChain && !hasBought) || (isOnChain && !hasBought) || isWithdraw) {
        // if (!isOnChain || !hasBought || isWithdraw) {
        console.log({
            isOnChain: !isOnChain,
            hasBought: !hasBought,
            isWithdraw: isWithdraw,
        });
        return {
            tx: null,
            price: price,
            outAmount: swapRes.amountOut,
        };
    }
    // return {
    //     tx: null,
    //     price: price,
    //     outAmount: swapRes.amountOut,
    // };
    const swapIx = await pumpSwapTx(
        pool,
        tokenAmount,
        false,
        new PublicKey(publicKey),
        isQuote,
        retry,
    );
    // const blockHash = await config.connection.getLatestBlockhash();
    const blockHash = await config.connection.getLatestBlockhash("processed");
    const newTx = new Transaction(blockHash);
    if (!swapIx) {
        return {
            tx: null,
            price: price,
            outAmount: swapRes.amountOut,
        };
    }
    // newTx.add(
    //     ComputeBudgetProgram.setComputeUnitPrice({
    //         microLamports: 100000,
    //     }),
    // );

    const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000,
    });
    newTx.add(priorityFeeInstruction);
    console.log(swapIx[0]?.programId.toBase58());
    console.log(swapIx[1]?.programId.toBase58());
    console.log(swapIx[2]?.programId.toBase58());
    console.log(swapIx[3]?.programId.toBase58());
    // swapIx.map((ix: any) => {
    //     newTx.add(ix);
    // });
    newTx.add(...swapIx);
    // newTx.recentBlockhash = blockHash.blockhash;
    console.log(blockHash.blockhash, "blockHash");
    const privateKeyArray = bs58.decode(privateKey);
    const wallet = Keypair.fromSecretKey(privateKeyArray);
    newTx.feePayer = wallet.publicKey;
    newTx.sign(wallet);
    const serialized = newTx.serialize();
    const swapTx = serialized.toString("base64");
    const tx = await executeTx(swapTx, privateKey, true, blockHash, newTx);
    return {
        tx: tx,
        price: price,
        outAmount: swapRes.amountOut,
    };
}
