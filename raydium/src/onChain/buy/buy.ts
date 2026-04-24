import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BloXRouteWrapper } from "../../bloxroute";
import { config } from "../../config";
import { executeTx } from "../executeTx";
export const sendBuyTransaction = async (
    mint: string,
    publicKey: string,
    privateKey: string,
    inAmount: number,
    isOnChain?: boolean,
    route?: "BloxRoute" | "Jupiter" | "Native" | null,
    fees?: number,
): Promise<{ tx: string | null; price: number } | null> => {
    const authHeader: string = process.env.AUTH_HEADER ?? "";
    const bloxRoute = new BloXRouteWrapper(authHeader);
    const AmountInSol = inAmount / LAMPORTS_PER_SOL;
    const swapRes = await bloxRoute.swapApi(
        mint,
        publicKey,
        AmountInSol,
        true,
        fees,
    );
    if (!swapRes) {
        console.log("swapRes", swapRes);
        return null;
    }
    const timeNow = new Date();
    const price = AmountInSol / swapRes.outAmount;
    console.log(
        price,
        "swapPrice",
        timeNow.toISOString(),
        `https://dexscreener.com/solana/${mint}`,
    );
    let maxRetries = 0;
    let retry: boolean = true;
    // while(retry && maxRetries < 3){
    // const hasBalance:boolean = await getBalance(publicKey, inAmount)
    // if(!hasBalance){
    //     console.log("not enough sol to buy")
    //     return null
    // }
    if (!isOnChain) {
        return {
            tx: null,
            price: price,
        };
    }

    const tx = await executeTx(swapRes.transaction, privateKey);
    retry = false;
    maxRetries++;
    return {
        tx: tx,
        price: price,
    };
    // const tokenBalance = await getTokenAmount(mint, publicKey)
    // if(tokenBalance && tx){
    //     retry = false
    //     return tx
    // }

    // }
    return null;
};

const getBalance = async (
    wallet: string,
    inAmount: number,
): Promise<boolean> => {
    let balance = await config.connection.getBalance(new PublicKey(wallet));
    console.log(balance, inAmount, balance > inAmount, "check balance");
    // balance = balance / LAMPORTS_PER_SOL
    // console.log(balance)
    return balance > inAmount;
};
export const getTokenAmount = async (
    mintToken: any,
    publicKey: string,
): Promise<number | null> => {
    const wallet = new PublicKey(publicKey);
    const token = new PublicKey(mintToken);
    const tokenAccounts = await config.connection.getParsedTokenAccountsByOwner(
        wallet,
        {
            mint: token,
        },
    );
    if (tokenAccounts.value.length === 0) {
        return null;
    }
    if (
        tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount ===
        "0"
    ) {
        return null;
    }
    console.log({
        tokenAccounts:
            tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount,
    });
    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
};
