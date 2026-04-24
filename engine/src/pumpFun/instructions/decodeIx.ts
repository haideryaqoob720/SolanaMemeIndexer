import type { Pump } from "../../types/pumpFunTypes";
import { BorshCoder } from "@coral-xyz/anchor";
import pumpfunIdl from "../../../pumpfun_idl.json";

export const decodePumpFunIx = (
    ixData: any,
    eventName: string,
    signature?: string,
) => {
    try {
        if (!ixData.unknown || !eventName) return null;
        // slice is used to remove the cpi log and discriminator from the buffer
        let coder = new BorshCoder(pumpfunIdl as any);
        let args = coder.events.decode(ixData.unknown.slice(8));
        if (!args) return;
        return args;
    } catch (error: any) {
        console.log(`https://solscan.io/tx/${signature}`);
        console.log(
            `error decoding ${eventName} buffer in pumpFun`,
            error.message,
        );
        return null;
    }
};
