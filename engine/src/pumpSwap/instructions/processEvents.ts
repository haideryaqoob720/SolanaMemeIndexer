import { VersionedTransactionResponse } from "@solana/web3.js";
import { startPumpswapCreateTokenProcess } from "../createProcess";
// import { handleExtendEvent } from "../extendAccount/extendEvent";
import { handleSwapEvent } from "../swapEvent";
import handleWithdrawEvent from "../withdraw/withdrawEvent";
import { sniperStrategies } from "@prisma/client";
import { strategyPendingVolume } from "../../redis/orderVolume";

export const processPumpSwapEvents = async (
    event: string,
    args: any,
    data: any,
    logs: string[],
    decodedTx: VersionedTransactionResponse,
    signature: string,
    strategies: sniperStrategies[] | null,
    orderVolumes: Map<string, strategyPendingVolume> | null,
) => {
    const isQuoteSol = args.isQuoteSol;
    switch (event) {
        case "CreatePoolEvent":
            // console.log("CreateEvent detected");
            if (!args?.data) {
                console.log("CreateEvent data is null");
                break;
            }
            // console.log(args);
            // console.log(`https://solscan.io/tx/${signature}`);
            startPumpswapCreateTokenProcess(args, decodedTx.slot);
            break;
        case "BuyEvent":
            // console.log(args);
            // console.log("BuyEvent detected");
            if (!args?.data) {
                break;
            }
            await handleSwapEvent(
                args,
                data,
                isQuoteSol ? true : false,
                logs,
                strategies,
                orderVolumes,
                isQuoteSol,
                args.hasArbitrage,
            );
            break;
        case "SellEvent":
            // console.log(args);
            // console.log("SellEvent detected");
            if (!args?.data) {
                break;
            }
            await handleSwapEvent(
                args,
                data,
                isQuoteSol ? false : true,
                logs,
                strategies,
                orderVolumes,
                isQuoteSol,
                args.hasArbitrage,
            );
            break;
        case "WithdrawEvent":
            // console.log(args);
            // console.log(`https://solscan.io/tx/${signature}`);
            // console.log("WithDrawEvent detected");
            if (!args?.data) {
                console.log("incomplete args withdraw", args.data);
                break;
            }
            await handleWithdrawEvent(args, data, logs, isQuoteSol);
            // handleSwapEvent(args, data, false, logs, true);
            break;
        // case "ExtendAccountEvent":
        //     console.log(args);
        //     console.log(args.name, "extend event");
        //     if (!args?.data) {
        //         return;
        //     }
        //     handleExtendEvent(args, data, logs);
        //     break;

        default:
            // console.log(`unhandled pumpswap event, ${args?.name}`)
            break;
    }
};
