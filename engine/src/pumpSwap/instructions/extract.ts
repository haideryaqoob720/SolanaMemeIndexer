import { SolanaParser } from "@shyft-to/solana-transaction-parser";
import pumpswapIdl from "../../../pumpswap_idl.json";
import { VersionedTransactionResponse } from "@solana/web3.js";
import { config } from "../../config";
import { decodeIx } from "./decodeIx";
import { has } from "lodash";

interface DecodedInstruction {
    name: string;
    data: any;
    mint?: string;
    isQuoteSol: boolean;
    hasArbitrage: boolean;
}

export const extractAllPumpSwapIx = (
    tx: VersionedTransactionResponse,
    signature: string,
    // mint: string,
) => {
    const pumpSwapParser = new SolanaParser([]);
    pumpSwapParser.addParserFromIdl(
        config.pumpswapProgram.toBase58(),
        pumpswapIdl as any,
    );
    const parsedInnerIxs =
        pumpSwapParser.parseTransactionWithInnerInstructions(tx);
    const hasArbitrageProgram = parsedInnerIxs.some(
        (ix) =>
            ix.programId.toBase58() ===
            "2VxcbQDXkbaLHzShMsJGieXGTd239FbNseX1Qx6yLW7V",
    );
    const pumpSwapIx = parsedInnerIxs.filter((ix) =>
        ix.programId.equals(config.pumpswapProgram),
    );
    // if (hasArbitrageProgram) {
    //     console.log(pumpSwapIx, "before ix filter");
    // }
    // console.log(
    //     `found ${pumpSwapIx.length / 2} pumpswap instructions in tx: https://solscan.io/tx/${signature} for ${mint}`,
    // );
    // console.log(parsedInnerIxs, "innerIxs");
    // const decodedIxs = pairInstructionsWithEvents(
    //     parsedInnerIxs,
    //     config.pumpswapProgram.toBase58(),
    //     pumpswapIdl,
    // );

    // const decodedIxs = pumpSwapIx
    //     .map((ix: any, index: number) => {
    //         if (ix.name !== "unknown" && ix.args) {
    //             // if (!pumpSwapIx[index + 1].parentProgramId) {
    //             //     console.log(
    //             //         `no self cpi log for ${ix.name} => https://solscan.io/tx/${signature}`,
    //             //     );
    //             //     return null;
    //             // }
    //             if (!pumpSwapIx[index + 1].args) {
    //                 console.log(pumpSwapIx, "pumpswap ix", index + 1);
    //                 console.log(
    //                     `no args for ${ix.name} => https://solscan.io/tx/${signature}`,
    //                 );
    //                 return null;
    //             }
    //             const eventName = `${snakeToPascal(ix.name)}Event`;
    //             let isQuoteSol: boolean = false;
    //             if (eventName === "BuyEvent" || eventName === "SellEvent") {
    //                 const baseMint = ix.accounts[3].pubkey;
    //                 const quoteMint = ix.accounts[4].pubkey;

    //                 if (!baseMint || !quoteMint) {
    //                     return null;
    //                 }
    //                 //Checking for quote mint
    //                 isQuoteSol = quoteMint.equals(config.solMint);

    //                 // console.log(`Quote token is ${isQuoteSol ? "SOL" : quoteMint.toBase58()}`);

    //                 if (
    //                     !pumpSwapIx[index].accounts[3].pubkey.equals(
    //                         config.solMint,
    //                     ) &&
    //                     !pumpSwapIx[index].accounts[4].pubkey.equals(
    //                         config.solMint,
    //                     )
    //                 ) {
    //                     console.log("soless tx", {
    //                         base: baseMint.toBase58(),
    //                         quote: quoteMint.toBase58(),
    //                         tx: `https://solscan.io/tx/${signature}`,
    //                     });
    //                     return null;
    //                 }
    //                 const args = decodeIx(
    //                     pumpSwapIx[index + 1].args,
    //                     eventName,
    //                     signature,
    //                 );
    //                 if (!args) {
    //                     return null;
    //                 }
    //                 return {
    //                     name: eventName,
    //                     data: args,
    //                     mint: isQuoteSol
    //                         ? baseMint.toBase58
    //                         : quoteMint.toBase58(),
    //                     isQuoteSol,
    //                 };
    //             }
    //             const args = decodeIx(
    //                 pumpSwapIx[index + 1].args,
    //                 eventName,
    //                 signature,
    //             );
    //             if (!args) {
    //                 return null;
    //             }
    //             return {
    //                 name: eventName,
    //                 data: args,
    //                 isQuoteSol,
    //             };
    //         }
    //     })
    //     .filter(Boolean);
    const decodedIxs: DecodedInstruction[] = [];
    // const solMintStr = config.solMint.toBase58();

    for (let i = 0; i < pumpSwapIx.length; i++) {
        const ix = pumpSwapIx[i];
        const nextIx = pumpSwapIx[i + 1];

        if (ix.name === "unknown" || !ix.args || !nextIx?.args) {
            if (ix.name !== "unknown" && ix.args && !nextIx?.args) {
                console.log(pumpSwapIx, "pumpswap ix", i + 1);
                console.log(
                    `no args for ${ix.name} => https://solscan.io/tx/${signature}`,
                );
            }
            continue;
        }

        const eventName = `${snakeToPascal(ix.name)}Event`;
        const args = decodeIx(nextIx.args, eventName, signature);

        if (!args) continue;

        if (eventName === "BuyEvent" || eventName === "SellEvent") {
            const baseMint = ix.accounts[3]?.pubkey;
            const quoteMint = ix.accounts[4]?.pubkey;

            if (!baseMint || !quoteMint) continue;

            const isBaseSol = baseMint.equals(config.solMint);
            const isQuoteSol = quoteMint.equals(config.solMint);

            if (!isBaseSol && !isQuoteSol) {
                console.log("soless tx", {
                    base: baseMint.toBase58(),
                    quote: quoteMint.toBase58(),
                    tx: `https://solscan.io/tx/${signature}`,
                });
                continue;
            }

            decodedIxs.push({
                name: eventName,
                data: args,
                mint: isQuoteSol ? baseMint.toBase58() : quoteMint.toBase58(),
                isQuoteSol,
                hasArbitrage: hasArbitrageProgram,
            });
        } else if (eventName === "WithdrawEvent") {
            const baseMint = ix.accounts[3]?.pubkey;
            const quoteMint = ix.accounts[4]?.pubkey;
            const isQuoteSol = quoteMint.equals(config.solMint);
            decodedIxs.push({
                name: eventName,
                data: args,
                mint: isQuoteSol ? baseMint.toBase58() : quoteMint.toBase58(),
                isQuoteSol,
                hasArbitrage: false,
            });
        } else {
            decodedIxs.push({
                name: eventName,
                data: args,
                isQuoteSol: false,
                hasArbitrage: false,
            });
        }
    }
    // if (hasArbitrageProgram) {
    //     console.log(
    //         decodedIxs,
    //         "after ix filter and decode",
    //         `https://solscan.io/tx/${signature}`,
    //     );
    // }
    return decodedIxs;
};

function snakeToPascal(str: string): string {
    return str.replace(/(^|_)([a-z])/g, (_, p, letter) => letter.toUpperCase());
}
