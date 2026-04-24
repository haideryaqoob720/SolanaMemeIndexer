import { BorshCoder } from "@coral-xyz/anchor";
import pumpswapIdl from "../../../pumpswap_idl.json";

export const decodeIx = (
    ixData: any,
    eventName: string,
    signature?: string,
) => {
    try {
        if (!ixData.unknown || !eventName) return null;
        let coder = new BorshCoder(pumpswapIdl as any);
        // this is to remove the cpi log and discriminator from the buffer
        let args = coder.types.decode(eventName, ixData.unknown.slice(16));
        // console.log(args, `decode ${eventName} buffer`);
        return args;
    } catch (error: any) {
        console.log(`https://solscan.io/tx/${signature}`);
        console.log(`error decoding ${eventName} buffer`, error.message);
        return null;
    }
};
