import { PumpAmmSdk } from "@pump-fun/pump-swap-sdk";
import { PumpAmmInternalSdk } from "@pump-fun/pump-swap-sdk";
import {
    ComputeBudgetProgram,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
} from "@solana/web3.js";
import { config } from "../config";
import { BN } from "bn.js";
// import { pumpSwapCreateDecode } from "./pumpSwap";
import { Transaction } from "@solana/web3.js";
import { executeTx } from "../onChain/executeTx";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import orderLogger from "../orderLogger";
import { calculateQuoteFromMaxQuote } from "./helpers";

interface txRes {
    txHash: string | null;
    price: number;
}

type Direction = "quoteToBase" | "baseToQuote";
const programId = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
const swap = new PumpAmmSdk(config.connection);
// const internal = new PumpAmmInternalSdk(config.connection)
export async function pumpSwapQuote(
    pool: string,
    inAmount: number,
    isBuy: boolean,
    retry?: number,
) {
    const amount = new BN(inAmount);
    if (isBuy) {
        // console.log(swap.programId());
        const quoteAmount = await swap.swapAutocompleteBaseFromQuote(
            new PublicKey(pool),
            amount,
            retry ? retry : isBuy ? 1 : 2,
            "quoteToBase",
        );
        const outAmount = quoteAmount.toNumber();
        // console.log(new PublicKey(pool).toBase58(), "in pump buy");
        return { amountOut: outAmount };
        // return { amountOut: 5 };
    }

    console.log(amount.toString());
    const quoteAmount = await swap.swapAutocompleteQuoteFromBase(
        new PublicKey(pool),
        amount,
        retry ? retry : isBuy ? 1 : 2,
        "baseToQuote",
    );
    const outAmount = quoteAmount.toNumber();
    return { amountOut: outAmount };
}

export async function pumpSwapTx(
    pool: string,
    inAmount: number,
    isBuy: boolean,
    signer: PublicKey,
    isQuoteSol: boolean,
    retry: number,
) {
    console.log("is quote sol", isQuoteSol);
    const amount = new BN(inAmount);
    const slippage = 2;
    if (isBuy) {
        if (isQuoteSol) {
            return getBuyIx(pool, amount, isBuy, signer, 1, isQuoteSol);
        } else {
            return getSellIx(pool, amount, isBuy, signer, 1);
        }
        // const buyInstruction = await swap.swapQuoteInstructions(
        //     new PublicKey(pool),
        //     amount,
        //     0.5,
        //     "quoteToBase",
        //     signer,
        // );
        // return buyInstruction;
    } else {
        // const originalBN = new BN('1000000000'); // example value

        // Multiply by 2 and divide by 100 (equivalent to multiplying by 0.02)
        const slippageAmount = amount.mul(new BN(slippage)).div(new BN(100));

        // Subtract from original
        const amountWithSlippage = amount.sub(slippageAmount);
        console.log("sellRes", amountWithSlippage);
        if (isQuoteSol) {
            return getSellIx(pool, amount, isBuy, signer, retry);
            // return getSellIx(pool, amountWithSlippage, isBuy, signer, retry);
        } else {
            return getBuyIx(pool, amount, isBuy, signer, retry, isQuoteSol);
            // return getBuyIx(pool, amountWithSlippage, isBuy, signer, retry);
        }
    }

    // const sellInstruction = await swap.swapBaseInstructions(
    //     new PublicKey(pool),
    //     amount,
    //     0.5,
    //     "baseToQuote",
    //     signer,
    // );
    // return sellInstruction;
}

async function getBuyIx(
    pool: string,
    amount: BN,
    isBuy: boolean,
    signer: PublicKey,
    slippage: number,
    isQuoteSol: boolean,
    retry?: number,
) {
    if (!isBuy && !isQuoteSol) {
        const quoteAmount = calculateQuoteFromMaxQuote(amount, 10);
        const buyInstruction = await swap.swapQuoteInstructions(
            new PublicKey(pool),
            quoteAmount,
            // retry ? retry : isBuy ? 1 : 2,
            10,
            "quoteToBase",
            signer,
        );
        return buyInstruction;
    }
    const buyInstruction = await swap.swapQuoteInstructions(
        new PublicKey(pool),
        amount,
        retry ? retry : isBuy ? 1 : 2,
        // slippage,
        "quoteToBase",
        signer,
    );
    return buyInstruction;
}

async function getSellIx(
    pool: string,
    amount: BN,
    isBuy: boolean,
    signer: PublicKey,
    slippage: number,
    retry?: number,
) {
    const sellInstruction = await swap.swapBaseInstructions(
        new PublicKey(pool),
        amount,
        retry ? retry : isBuy ? 1 : 2,
        // slippage,
        "baseToQuote",
        signer,
    );
    return sellInstruction;
}

export async function sendBuyTxPumpSwap(
    market: string,
    isOnChain: boolean,
    inAmount: number,
    publicKey: string,
    privateKey: string,
    price: number,
    isQuoteSol: boolean,
) {
    try {
        if (!isOnChain) {
            return {
                tx: null,
                price: price,
            };
        }
        orderLogger.debug("creating buy tx", market);
        const privateKeyArray = bs58.decode(privateKey);
        const wallet = Keypair.fromSecretKey(privateKeyArray);
        console.log("buying");
        const swapIx = await pumpSwapTx(
            market,
            inAmount,
            true,
            // new PublicKey(publicKey),
            wallet.publicKey,
            isQuoteSol,
            0,
        );
        // console.log(swapIx);
        // const blockHash = await config.connection.getLatestBlockhash();
        const blockHash =
            await config.connection.getLatestBlockhash("processed");
        const newTx = new Transaction(blockHash);
        if (!swapIx) {
            return {
                tx: null,
                price: price,
            };
        }
        // newTx.add(
        //     ComputeBudgetProgram.setComputeUnitPrice({
        //         microLamports: 100000,
        //     }),
        // );

        const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice(
            {
                microLamports: 1000000,
            },
        );
        newTx.add(priorityFeeInstruction);
        console.log(swapIx[0]?.programId.toBase58());
        console.log(swapIx[1]?.programId.toBase58());
        console.log(swapIx[2]?.programId.toBase58());
        console.log(swapIx[3]?.programId.toBase58());
        // swapIx.map((ix: any) => {
        //     newTx.add(ix);
        // });
        newTx.add(...swapIx);

        newTx.feePayer = wallet.publicKey;
        newTx.sign(wallet);
        // newTx.feePayer = new PublicKey(publicKey);
        // newTx.recentBlockhash = blockHash.blockhash;
        console.log(blockHash, "blockHash");
        console.log(newTx.recentBlockhash);
        const serialized = newTx.serialize();
        const swapTx = serialized.toString("base64");
        console.log(newTx.instructions.length, "ix length");
        // console.log(swapTx, "swapTx");
        const tx = await executeTx(swapTx, privateKey, true, blockHash, newTx);
        // console.log();
        return {
            tx: tx,
            price: price,
        };
    } catch (error: any) {
        console.log("error processing tx", error.message);
    }
}
