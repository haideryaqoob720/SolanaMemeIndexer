import { decodePumpFunIx } from "./decodeIx";

function extractPumpFunEvents(pumpFunIx: any, signature: string) {
    const decodedIxs = pumpFunIx
        .map((ix: any, index: number) => {
            if (ix.name !== "unknown" && ix.args) {
                if (!pumpFunIx[index + 1] || !pumpFunIx[index + 1].args) {
                    console.log(pumpFunIx, "pumpFun ix", index + 1);
                    console.log(
                        `no args for ${ix.name} => https://solscan.io/tx/${signature}`,
                    );
                    return null;
                }

                const eventName = `${snakeToPascal(ix.name === "buy" || ix.name === "sell" ? "trade" : ix.name)}Event`;
                const args = decodePumpFunIx(
                    pumpFunIx[index + 1].args,
                    eventName,
                    signature,
                );
                if (!args) {
                    return;
                }
                return {
                    name: eventName,
                    data: args,
                };
            }
        })
        .filter(Boolean);
    return decodedIxs;
}

function snakeToPascal(str: string): string {
    return str.replace(/(^|_)([a-z])/g, (_, p, letter) => letter.toUpperCase());
}
export default extractPumpFunEvents;
