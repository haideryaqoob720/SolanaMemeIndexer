import { VersionedTransactionResponse } from "@solana/web3.js";
import { createProcess } from "../../createToken/handleProcesses";
import { RedisCache } from "../../redis/store";

async function processPumpFunEvents(
    event: string,
    args: any,
    decodedTx: VersionedTransactionResponse,
    tokenMap: RedisCache,
) {
    switch (event) {
        case "CreateEvent":
            // console.log(args, args.name);
            createProcess(
                args.data.data.mint.toBase58(),
                args.data.data.user.toBase58(),
                args.data.data.name,
                args.data.data.symbol,
                args.data.data.uri,
                args.data.data.bonding_curve.toBase58(),
            ); // creates a process to fetch and calculate metrics adds the token to the cache and the db without awaiting the stream
            break;
        case "TradeEvent":
            // console.log(args);
            await tokenMap.updateFromPumpfun(
                args.data.data.mint.toBase58(),
                args.data.data.isBuy,
                decodedTx.transaction.signatures[0],
                args.data.data.virtual_sol_reserves,
                args.data.data.virtual_token_reserves,
                args.data.data.real_sol_reserves,
                args.data.data.real_token_reserves,
                args.data,
            );
            break;
        case "CompleteEvent":
            // console.log(args, args.name);
            await tokenMap.bondingCompleted(
                args.data.data.mint.toBase58(),
                args.data.data.timestamp.toNumber(),
            );
            break;
    }
}

export default processPumpFunEvents;
