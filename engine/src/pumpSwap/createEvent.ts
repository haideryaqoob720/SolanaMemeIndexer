import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config } from "../config";
import { BN } from "@coral-xyz/anchor";
import { dexPool, pumpSwapCreateDecode } from "../types";
import { PublicKey } from "@solana/web3.js";
import getRedisClient, { RedisCache } from "../redis/store";
import { tokenInitialMetrics } from "../filters/basic/getInitialMetrics";
import { createPumpSwapToken, createToken } from "../db/addToken";
import { rugCheck } from "../filters/basic/rugCheck";
import { addRugCheck } from "../db/addRugCheck";
import getPumpSwapStore from "../redis/pumpswap";
import getGeneralPoolStore from "../redis/generalPools";
import axios from "axios";
import getHolderStore from "../redis/holders";
import { addTokenPool } from "../db/pools/addTokenPool";

export const decodeEvent = (
    args: any,
    solPrice: number,
): pumpSwapCreateDecode | null => {
    if (!args || !args.data) {
        return null;
    }
    if (
        !args.data.quote_mint ||
        !args.data.base_mint ||
        !args.data.pool_quote_amount ||
        !args.data.pool_base_amount ||
        !args.data.quote_mint_decimals ||
        !args.data.base_mint_decimals
    ) {
        console.log("imcomplete args from stream");
        return null;
    }
    try {
        const pumpQuote = args.data.quote_mint;
        const pumpBase = args.data.base_mint;
        const isQuoteSol =
            pumpQuote === config.solMint.toBase58() ? true : false;
        const reserveSol = isQuoteSol
            ? new BN(args.data.pool_quote_amount, 16)
            : new BN(args.data.pool_base_amount, 16);
        const reserveToken = isQuoteSol
            ? new BN(args.data.pool_base_amount, 16)
            : new BN(args.data.pool_quote_amount, 16);
        const decimals = isQuoteSol
            ? new BN(args.data.base_mint_decimals, 16)
            : new BN(args.data.quote_mint_decimals, 16);
        let liquidityInSol = new BN(args.data.initial_liquidity, 16).divmod(
            new BN(LAMPORTS_PER_SOL),
        );
        liquidityInSol = parseFloat(
            `${liquidityInSol.div.toNumber()}.${liquidityInSol.mod.toNumber()}`,
        ).toFixed(6);
        let sol: any = reserveSol.divmod(new BN(LAMPORTS_PER_SOL));
        sol = parseFloat(`${sol.div.toNumber()}.${sol.mod.toNumber}`).toFixed(
            6,
        );
        let tokenAmount: any = reserveToken.divmod(
            new BN(Math.pow(10, decimals)),
        );
        tokenAmount = parseFloat(
            `${tokenAmount.div.toNumber()}.${tokenAmount.mod.toNumber()}`,
        ).toFixed(6);
        let lpTokenBurn: any = new BN(args.data.lp_token_amount_out, 16).divmod(
            new BN(LAMPORTS_PER_SOL),
        );
        lpTokenBurn = parseFloat(
            `${lpTokenBurn.div.toNumber()}.${lpTokenBurn.mod.toNumber()}`,
        ).toFixed(8);
        const priceInSol = sol / tokenAmount;
        const token: pumpSwapCreateDecode = {
            mint: isQuoteSol ? pumpBase : pumpQuote,
            creator: args.data.creator,
            market: args.data.pool,
            quoteVault: pumpQuote,
            baseVault: pumpBase,
            isQuoteSol: pumpQuote === config.solMint.toBase58() ? true : false,
            reserveSol: sol.toString(),
            reserveToken: tokenAmount.toString(),
            liquidityInSol: sol + tokenAmount * priceInSol,
            liquidityInUsd:
                sol * solPrice + tokenAmount * priceInSol * solPrice,
            priceInSol: priceInSol,
            priceInUsd: priceInSol * solPrice,
            lpTokenBurn: lpTokenBurn,
            decimals: decimals,
        };
        return token;
    } catch (error: any) {
        console.log("error decoding event: ", error.message);
        return null;
    }
};

async function fetchTokenMetadata(mint: PublicKey) {
    const metadataPDA = getMetadataPDA(mint);
    const accountInfo = await config.connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
        return null;
    }

    const rawData = accountInfo.data;

    // helper to strip UTF-8 null-terminators
    function bufferToString(buf: Buffer) {
        return buf.toString("utf8").replace(/\0/g, "").trim();
    }

    // Adjust offset based on Metaplex metadata layout
    let offset = 1 + 32 + 32; // key + update auth + mint (rough example)

    const nameLen = rawData.readUInt32LE(offset);
    offset += 4;
    const name = bufferToString(rawData.subarray(offset, offset + nameLen));
    offset += nameLen;

    const symbolLen = rawData.readUInt32LE(offset);
    offset += 4;
    const symbol = bufferToString(rawData.subarray(offset, offset + symbolLen));
    offset += symbolLen;

    const uriLen = rawData.readUInt32LE(offset);
    offset += 4;
    const uri = bufferToString(rawData.subarray(offset, offset + uriLen));
    offset += uriLen;

    return { name, symbol, uri };
}

function getMetadataPDA(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            config.metadataProgram.toBuffer(),
            mint.toBuffer(),
        ],
        config.metadataProgram,
    )[0];
}

export const handleCreateEvent = async (
    args: any,
    slot: any,
    tokenMap: RedisCache,
) => {
    const poolCache = await getGeneralPoolStore();
    const pumpSwapCache = await getPumpSwapStore();
    const holdersCache = await getHolderStore();
    const solPrice = await tokenMap.getSolPrice();
    const decoded = decodeEvent(args, solPrice);
    // console.log(decoded)
    // try {
    //     console.log(slot, "<----------------------block");
    //     try {
    //         axios.post("http://46.4.21.252:5003/placeOrder/pumpSwap", {
    //             decoded,
    //             slot,
    //         });
    //     } catch (error) {}
    // } catch (error: any) {
    //     console.log("error creating pumpswap order", error.message);
    // }
    if (!decoded) {
        console.log("could not decode event");
        return;
    }
    const existingToken = await tokenMap.readToken(decoded.mint);
    let dbResponse: any = null;
    if (!existingToken) {
        const metadata = await fetchTokenMetadata(new PublicKey(decoded.mint));
        let metrics = await tokenInitialMetrics(
            decoded.mint,
            decoded.creator,
            metadata?.name,
            metadata?.symbol,
            metadata?.uri,
        );
        if (metrics.creator_balance) {
            await holdersCache.updateHolder(
                decoded.mint,
                decoded.creator,
                metrics.creator_balance,
                "buy",
            );
        }
        dbResponse = await createToken(metrics);
        if (dbResponse.socials.length > 0) {
            const rugData = await rugCheck(
                decoded.mint,
                dbResponse.name,
                dbResponse.symbol,
                dbResponse.socials,
                dbResponse.mintable ?? false,
                dbResponse.freezeable ?? false,
                dbResponse.creator_equity ?? 2,
                dbResponse.top_10_holder_equity ?? 3,
            );
            await addRugCheck(rugData, decoded.mint); // some problem when creating the relation
        }
    }
    let pumpRes = await createPumpSwapToken(decoded);
    if (!pumpRes) {
        console.log("could not create pump swap token");
        return;
    }
    if (dbResponse) {
        const reserve_sol = pumpRes.reserveSol;
        const reserve_token = pumpRes.reserveToken;
        await tokenMap.create(
            decoded.mint,
            { ...dbResponse, reserve_sol, reserve_token },
            0,
        );
    }
    await pumpSwapCache.createToken(decoded.mint, pumpRes);
    const poolData: dexPool = {
        mint: decoded.mint,
        poolAddress: decoded.market,
        dex: "PumpSwap",
        priceInSol: pumpRes.priceInSol,
        priceInUsd: pumpRes.priceInUsd,
        solReserves: pumpRes.reserveSol,
        tokenReserves: pumpRes.reserveToken,
        liquidityInSol: pumpRes.liquidityInSol,
        liquidityInUsd: pumpRes.liquidityInUsd,
        totalTx: 0,
        buyTx: 0,
        sellTx: 0,
    };
    await poolCache.addPool(poolData);
    await addTokenPool(poolData);
};

const [args, slot] = process.argv.slice(2);
process.on("message", async () => {
    const createInfo = JSON.parse(args);
    // console.log(slot, createInfo, "in process");
    // console.log(
    //     `CreateEvent detected for base: ${createInfo.data.quote_mint}, quote: ${createInfo.data.base_mint}`,
    // );
    const tokenMap = await getRedisClient();
    try {
        await handleCreateEvent(createInfo, slot, tokenMap);
        // await tokenMap.disconnect();
        process.exit();
    } catch (error) {
        process.exit(1);
    }
});
process.on("SIGINT", () => {
    console.log("SIGINT received, exiting...");
    process.exit();
});
process.on("SIGTERM", () => {
    console.log("SIGTERM received, exiting...");
    process.exit();
});
