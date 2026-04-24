import { SolanaParser } from "@shyft-to/solana-transaction-parser";
import { VersionedTransactionResponse } from "@solana/web3.js";
import pumpswapIdl from "../../pumpswap_idl.json";
import raydiumIdl from "../../raydium_idl.json";
import pumpfunIdl from "../../pumpfun_idl.json";

import { config } from "../config";

class GeneralParser {
    generalParser: SolanaParser;
    constructor() {
        this.generalParser = new SolanaParser([]);
        this.generalParser.addParserFromIdl(
            config.pumpswapProgram.toBase58(),
            pumpswapIdl as any,
        );
        this.generalParser.addParserFromIdl(
            config.pumpswapProgram.toBase58(),
            raydiumIdl as any,
        );
        this.generalParser.addParserFromIdl(
            config.pumpProgram.toBase58(),
            pumpfunIdl as any,
        );
    }
    private extractRayLogs(logs: string[]) {
        if (!logs) return [];

        return logs
            .filter((log) => log.includes("Program log: ray_log:"))
            .map((log) => {
                const rayLogPart = log.split("Program log: ray_log:")[1];
                return rayLogPart ? rayLogPart.trim() : null;
            })
            .filter(Boolean); // Remove any null values
    }
    getAllInstructionsFromTx(tx: VersionedTransactionResponse): {
        pumpSwapIx: any[] | null;
        raydiumIx: any[] | null;
        pumpfunIx: any[] | null;
    } | null {
        try {
            const parsedInnerIxs =
                this.generalParser.parseTransactionWithInnerInstructions(tx);
            const pumpSwapIx = parsedInnerIxs.filter((ix) =>
                ix.programId.equals(config.pumpswapProgram),
            );
            const raydiumIx = parsedInnerIxs.filter((ix) =>
                ix.programId.equals(config.raydiumProgram),
            );
            const pumpfunIx = parsedInnerIxs.filter((ix) =>
                ix.programId.equals(config.pumpProgram),
            );
            if (
                pumpSwapIx.length === 0 &&
                raydiumIx.length === 0 &&
                pumpfunIx.length === 0
            ) {
                return null;
            }
            return {
                pumpSwapIx: pumpSwapIx,
                raydiumIx: raydiumIx,
                pumpfunIx: pumpfunIx,
            };
        } catch (error: any) {
            console.log(
                "error parsing tx in general parser",
                error.message,
                error,
            );
            return null;
        }
    }
    getRaydiumInstructionsFromTx(
        tx: VersionedTransactionResponse,
    ): any[] | null {
        try {
            const parsedInnerIxs =
                this.generalParser.parseTransactionWithInnerInstructions(tx);
            const raydiumIx = parsedInnerIxs.filter((ix) =>
                ix.programId.equals(config.raydiumProgram),
            );
            const rayLogs = this.extractRayLogs(tx.meta?.logMessages ?? []);
            const raydiumIxWithLog = raydiumIx.map((ix: any, index: number) => {
                return {
                    ...ix,
                    rayLog: rayLogs[index],
                };
            });
            return raydiumIxWithLog;
        } catch (error: any) {
            console.log(
                "error getting raydium ix with raylog",
                error.message,
                error,
            );
            return null;
        }
    }
    getAllPumpfunIxFromTx(tx: VersionedTransactionResponse): any[] | null {
        try {
            const parsedInnerIxs =
                this.generalParser.parseTransactionWithInnerInstructions(tx);
            const pumpfunIx = parsedInnerIxs.filter((ix) =>
                ix.programId.equals(config.pumpProgram),
            );
            return pumpfunIx;
        } catch (error: any) {
            console.log("error getting pumpfun ix", error.message, error);
            return null;
        }
    }
}

export default GeneralParser;
