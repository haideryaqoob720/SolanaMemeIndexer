import { struct, u64, u8 } from "@raydium-io/raydium-sdk";
// const { BN } = require("@coral-xyz/anchor"); // Assuming BN is imported like this for big numbers
import { BN } from "@coral-xyz/anchor";
// import { SOL } from "./constants";
// Constants for conversion
const LAMPORTS_PER_SOL = new BN(1000000000); // 1 SOL = 1 billion lamports

interface TokenBalance {
    mint: string;
    [key: string]: any;
}

interface SwapLogData {
    type: number;
    inn: BN;
    out: BN;
    direction: BN;
    source: BN;
    base: BN;
    quote: BN;
    delta: BN;
}

interface RealTimeMetrics {
    price: {
        usd: number;
        sol: number;
    };
    liquidity: {
        usd: number;
        sol: number;
    };
}

interface CalculatePricesParams {
    decoded: SwapLogData;
    decimals: number;
    isBaseVaultToken: boolean;
    solanaUsdPrice: number; // Assuming solanaUsdPrice is provided from somewhere
}

const formatBNToFloat = (bnValue: BN, divisor: BN): number => {
    let _bnValue = bnValue.divmod(divisor);
    try {
        _bnValue = parseFloat(
            `${_bnValue.div.toNumber()}.${_bnValue.mod.toNumber()}`,
        ).toFixed(2);
    } catch (error) {
        _bnValue = Number.MAX_SAFE_INTEGER;
    }

    return _bnValue;
};

export const calculatePrices = (
    decoded: any,
    decimals: any,
    isBaseVaultToken: any,
    solanaUsdPrice: any,
): RealTimeMetrics => {
    const TOKEN_DECIMALS = new BN(10 ** decimals);

    // Helper function to format BN to float

    // Format the amounts
    const solAmount = formatBNToFloat(
        isBaseVaultToken ? decoded.quote : decoded.base,
        new BN(LAMPORTS_PER_SOL),
    );

    const tokenAmount = formatBNToFloat(
        isBaseVaultToken ? decoded.base : decoded.quote,
        TOKEN_DECIMALS,
    );

    // Calculate prices
    const tokenPriceInSol = solAmount / tokenAmount;
    const tokenPriceInUsd = tokenPriceInSol * solanaUsdPrice;
    const liquidityInUsd =
        tokenAmount * tokenPriceInUsd + solAmount * solanaUsdPrice;
    const liquidityInSol = liquidityInUsd / solanaUsdPrice;

    return {
        price: {
            usd: tokenPriceInUsd,
            sol: tokenPriceInSol,
        },
        liquidity: {
            usd: liquidityInUsd,
            sol: liquidityInSol,
        },
    };
};

export const decodeRayLog = (
    rayLog: string,
    quoteIsSol: any,
    SOL_PRICE: number,
    decimals: number,
) => {
    // const logs = data?.transaction?.transaction?.meta?.logMessages;
    // if (!logs) return undefined;

    // const rayLog = logs.find((log: string) => log.includes("ray_log:"));
    // if (!rayLog) return undefined;

    // const base64Data = rayLog.split("ray_log:")[1].trim();
    const buffer = Buffer.from(rayLog, "base64");

    if (buffer.length !== 57) {
        return undefined;
    }

    const swapLogStruct = struct([
        u8("type"),
        u64("inn"),
        u64("out"),
        u64("direction"),
        u64("source"),
        u64("base"),
        u64("quote"),
        u64("delta"),
    ]);

    const decoded = swapLogStruct.decode(buffer) as SwapLogData;

    const metrics = calculatePrices(decoded, decimals, !quoteIsSol, SOL_PRICE);
    let { type, inn, out, direction, source, base, quote } = decoded;
    const TOKEN_DECIMALS = new BN(1000000);

    return {
        type,
        // inn: inn.toNumber(),
        // out: out.toNumber(),
        // direction: direction.toNumber(),
        // source: source.toNumber(),
        base: formatBNToFloat(base, TOKEN_DECIMALS),
        quote: formatBNToFloat(quote, LAMPORTS_PER_SOL),
        price: metrics.price.sol,
        metrics,
    };
};
